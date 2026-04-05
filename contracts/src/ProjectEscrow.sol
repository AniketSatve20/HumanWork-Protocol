// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "openzeppelin-contracts/contracts/access/AccessControl.sol";
import "./UserRegistry.sol";
import "./AgencyRegistry.sol";
import "./EnterpriseAccess.sol";

/**
 * @title ProjectEscrow V6
 * @notice B2B Escrow with dynamic milestones, dispute resolution, and platform fees
 * @dev Client creates project → Freelancer assigned later → Milestones → Payment
 *      Integrates with UserRegistry, AgencyRegistry, EnterpriseAccess, and DisputeJury
 */
contract ProjectEscrow is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;

    // ============ Roles ============

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");
    bytes32 public constant DISPUTE_RESOLVER_ROLE = keccak256("DISPUTE_RESOLVER_ROLE");

    // ============ State Variables ============

    IERC20 public immutable STABLECOIN;
    UserRegistry public immutable userRegistry;
    AgencyRegistry public immutable agencyRegistry;
    EnterpriseAccess public enterpriseAccess;
    address public disputeJuryAddress;

    uint256 public projectCounter;

    /// @notice Platform fee in basis points (250 = 2.5%)
    uint256 public platformFeeBps = 250;
    uint256 public constant MAX_FEE_BPS = 1000; // 10% max
    uint256 public accumulatedFees;

    enum MilestoneStatus {
        Pending,
        Completed,
        Approved,
        Disputed
    }

    enum ProjectStatus {
        Open,       // Created by client, no freelancer yet
        Active,     // Freelancer assigned, work in progress
        Completed,
        Cancelled
    }

    struct Milestone {
        string description;
        uint256 amount;
        MilestoneStatus status;
        uint256 completionTime;
    }

    struct Project {
        uint256 projectId;
        address client;
        address freelancer;
        uint256 agencyId;
        uint256 totalAmount;
        uint256 amountPaid;
        ProjectStatus status;
        Milestone[] milestones;
        bool isEnterpriseProject;
        string metadataUri;
    }

    // ============ Storage ============

    mapping(uint256 => Project) public projects;
    mapping(uint256 => uint256) public disputeToProject;
    mapping(uint256 => uint256) public disputeToMilestone;

    // ============ Events ============

    event ProjectCreated(
        uint256 indexed projectId, address indexed client, uint256 totalAmount, string metadataUri
    );
    event FreelancerAssigned(uint256 indexed projectId, address indexed freelancer);
    event MilestoneAdded(uint256 indexed projectId, uint256 indexed milestoneId, uint256 amount);
    event MilestoneCompleted(uint256 indexed projectId, uint256 indexed milestoneId);
    event MilestoneApproved(uint256 indexed projectId, uint256 indexed milestoneId, uint256 amount);
    event ProjectCancelled(uint256 indexed projectId, address indexed cancelledBy, string reason);
    event DisputeCreated(uint256 indexed projectId, uint256 indexed milestoneId, uint256 disputeId);
    event DisputeResolved(uint256 indexed projectId, uint256 indexed milestoneId, uint8 outcome);
    event PlatformFeeCollected(uint256 indexed projectId, uint256 amount);

    // ============ Errors ============

    error NotClientOrFreelancer();
    error NotClient();
    error NotFreelancer();
    error InvalidAmount();
    error InvalidAddress();
    error MilestoneNotPending();
    error MilestoneNotCompleted();
    error MilestoneNotDisputed();
    error ProjectNotOpen();
    error ProjectNotActive();
    error FreelancerAlreadyAssigned();
    error ClientCannotBeFreelancer();
    error Unauthorized();
    error OnlyDisputeJury();

    // ============ Constructor ============

    constructor(address _stablecoin, address _userRegistry, address _agencyRegistry, address _enterpriseAccess) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(FEE_MANAGER_ROLE, msg.sender);

        STABLECOIN = IERC20(_stablecoin);
        userRegistry = UserRegistry(_userRegistry);
        agencyRegistry = AgencyRegistry(_agencyRegistry);
        enterpriseAccess = EnterpriseAccess(_enterpriseAccess);
    }

    // ============ Project Creation (No Freelancer Required) ============

    /**
     * @notice Client creates a project WITHOUT specifying a freelancer
     * @param milestoneAmounts Array of payment amounts per milestone
     * @param milestoneDescriptions Array of milestone descriptions
     * @param metadataUri IPFS URI with full project details
     * @return projectId The new project ID
     */
    function createProject(
        uint256[] calldata milestoneAmounts,
        string[] calldata milestoneDescriptions,
        string calldata metadataUri
    ) external nonReentrant returns (uint256) {
        require(milestoneAmounts.length > 0, "No milestones");
        require(milestoneAmounts.length == milestoneDescriptions.length, "Mismatched arrays");

        // ── Checks ──
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            require(milestoneAmounts[i] > 0, "Milestone amount must be > 0");
            totalAmount += milestoneAmounts[i];
        }

        // ── Interactions (pull payment) ──
        STABLECOIN.safeTransferFrom(msg.sender, address(this), totalAmount);

        // ── Effects ──
        uint256 projectId = ++projectCounter;
        Project storage proj = projects[projectId];

        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            proj.milestones.push(
                Milestone({
                    description: milestoneDescriptions[i],
                    amount: milestoneAmounts[i],
                    status: MilestoneStatus.Pending,
                    completionTime: 0
                })
            );
        }

        proj.projectId = projectId;
        proj.client = msg.sender;
        proj.totalAmount = totalAmount;
        proj.status = ProjectStatus.Open;
        proj.metadataUri = metadataUri;

        bool isEnterprise = enterpriseAccess.isEnterpriseUser(msg.sender);
        proj.isEnterpriseProject = isEnterprise;

        // ── External interactions ──
        if (isEnterprise) {
            enterpriseAccess.recordProjectCreated(msg.sender, totalAmount);
        }

        emit ProjectCreated(projectId, msg.sender, totalAmount, metadataUri);
        return projectId;
    }

    /**
     * @notice Client assigns a freelancer to an open project
     * @param projectId The project to assign
     * @param freelancer The freelancer address
     */
    function assignFreelancer(uint256 projectId, address freelancer) external {
        Project storage proj = projects[projectId];
        if (msg.sender != proj.client) revert NotClient();
        if (proj.status != ProjectStatus.Open) revert ProjectNotOpen();
        if (freelancer == address(0)) revert InvalidAddress();
        if (freelancer == msg.sender) revert ClientCannotBeFreelancer();

        proj.freelancer = freelancer;
        proj.status = ProjectStatus.Active;

        emit FreelancerAssigned(projectId, freelancer);
    }

    // ============ Milestone Management ============

    function addMilestone(uint256 projectId, uint256 amount, string memory description) external nonReentrant {
        Project storage proj = projects[projectId];
        if (msg.sender != proj.client) revert NotClient();
        if (proj.status != ProjectStatus.Active && proj.status != ProjectStatus.Open) revert ProjectNotActive();
        if (amount == 0) revert InvalidAmount();

        STABLECOIN.safeTransferFrom(msg.sender, address(this), amount);

        proj.milestones.push(
            Milestone({
                description: description,
                amount: amount,
                status: MilestoneStatus.Pending,
                completionTime: 0
            })
        );
        proj.totalAmount += amount;

        emit MilestoneAdded(projectId, proj.milestones.length - 1, amount);
    }

    function completeMilestone(uint256 projectId, uint256 milestoneId) external nonReentrant {
        Project storage proj = projects[projectId];
        if (msg.sender != proj.freelancer) revert NotFreelancer();
        if (proj.status != ProjectStatus.Active) revert ProjectNotActive();

        Milestone storage milestone = proj.milestones[milestoneId];
        if (milestone.status != MilestoneStatus.Pending) revert MilestoneNotPending();

        milestone.status = MilestoneStatus.Completed;
        milestone.completionTime = block.timestamp;

        emit MilestoneCompleted(projectId, milestoneId);
    }

    function approveMilestone(uint256 projectId, uint256 milestoneId) external nonReentrant {
        Project storage proj = projects[projectId];
        if (msg.sender != proj.client) revert NotClient();
        if (proj.status != ProjectStatus.Active) revert ProjectNotActive();

        Milestone storage milestone = proj.milestones[milestoneId];
        if (milestone.status != MilestoneStatus.Completed) revert MilestoneNotCompleted();

        // ── Effects (all state changes before external calls) ──
        milestone.status = MilestoneStatus.Approved;

        uint256 fee = (milestone.amount * platformFeeBps) / 10000;
        uint256 freelancerPayment = milestone.amount - fee;

        proj.amountPaid += milestone.amount;
        accumulatedFees += fee;

        bool allApproved = _allMilestonesApproved(projectId);
        if (allApproved) {
            proj.status = ProjectStatus.Completed;
        }

        // ── Interactions (external calls last) ──
        STABLECOIN.safeTransfer(proj.freelancer, freelancerPayment);

        if (allApproved) {
            userRegistry.addAttestation(proj.freelancer, UserRegistry.AttestationType.PROJECT, projectId);
        }

        emit MilestoneApproved(projectId, milestoneId, freelancerPayment);
        if (fee > 0) emit PlatformFeeCollected(projectId, fee);
    }

    // ============ Cancellation ============

    function clientCancel(uint256 projectId) external nonReentrant {
        Project storage proj = projects[projectId];
        if (msg.sender != proj.client) revert NotClient();
        if (proj.status != ProjectStatus.Active && proj.status != ProjectStatus.Open) revert ProjectNotActive();

        uint256 refundAmount = 0;
        uint256 freelancerPayment = 0;

        for (uint256 i = 0; i < proj.milestones.length; i++) {
            if (proj.milestones[i].status == MilestoneStatus.Pending) {
                refundAmount += proj.milestones[i].amount;
            } else if (proj.milestones[i].status == MilestoneStatus.Completed) {
                freelancerPayment += proj.milestones[i].amount;
                proj.milestones[i].status = MilestoneStatus.Approved;
            }
        }

        // ── Effects ──
        proj.status = ProjectStatus.Cancelled;

        uint256 fee = 0;
        if (freelancerPayment > 0 && proj.freelancer != address(0)) {
            fee = (freelancerPayment * platformFeeBps) / 10000;
            accumulatedFees += fee;
        }

        // ── Interactions ──
        if (freelancerPayment > 0 && proj.freelancer != address(0)) {
            STABLECOIN.safeTransfer(proj.freelancer, freelancerPayment - fee);
        }
        if (refundAmount > 0) {
            STABLECOIN.safeTransfer(proj.client, refundAmount);
        }

        emit ProjectCancelled(projectId, msg.sender, "Client cancelled");
    }

    function freelancerCancel(uint256 projectId) external nonReentrant {
        Project storage proj = projects[projectId];
        if (msg.sender != proj.freelancer) revert NotFreelancer();
        if (proj.status != ProjectStatus.Active) revert ProjectNotActive();

        uint256 refundAmount = 0;
        for (uint256 i = 0; i < proj.milestones.length; i++) {
            if (proj.milestones[i].status == MilestoneStatus.Pending ||
                proj.milestones[i].status == MilestoneStatus.Completed) {
                refundAmount += proj.milestones[i].amount;
            }
        }

        proj.status = ProjectStatus.Cancelled;

        // ── Interactions ──
        if (refundAmount > 0) {
            STABLECOIN.safeTransfer(proj.client, refundAmount);
        }

        userRegistry.addAttestationWithMetadata(
            proj.freelancer, UserRegistry.AttestationType.NEGATIVE, projectId, "Freelancer cancelled project", false
        );

        emit ProjectCancelled(projectId, msg.sender, "Freelancer cancelled");
    }

    // ============ Dispute Resolution ============

    function createDispute(uint256 projectId, uint256 milestoneId) external nonReentrant {
        Project storage proj = projects[projectId];
        if (msg.sender != proj.client && msg.sender != proj.freelancer) revert NotClientOrFreelancer();
        if (proj.status != ProjectStatus.Active) revert ProjectNotActive();
        if (disputeJuryAddress == address(0)) revert Unauthorized();

        Milestone storage milestone = proj.milestones[milestoneId];
        require(
            milestone.status == MilestoneStatus.Completed || milestone.status == MilestoneStatus.Pending,
            "Cannot dispute this milestone"
        );

        milestone.status = MilestoneStatus.Disputed;

        uint256 disputeId = IDisputeJury(disputeJuryAddress)
            .createDispute(projectId, milestoneId, proj.client, proj.freelancer, milestone.amount);

        disputeToProject[disputeId] = projectId;
        disputeToMilestone[disputeId] = milestoneId;

        emit DisputeCreated(projectId, milestoneId, disputeId);
    }

    /**
     * @notice Called by DisputeJury to distribute disputed funds
     * @param disputeId The dispute ID
     * @param outcome 1=AcceptAISplit, 2=ClientWins, 3=FreelancerWins
     * @param clientShare Percentage to client (0-100)
     * @param freelancerShare Percentage to freelancer (0-100)
     */
    function resolveDispute(
        uint256 disputeId,
        uint8 outcome,
        uint8 clientShare,
        uint8 freelancerShare
    ) external onlyRole(DISPUTE_RESOLVER_ROLE) {
        // ── Checks ──
        require(clientShare + freelancerShare == 100, "Shares must total 100");

        uint256 projectId = disputeToProject[disputeId];
        uint256 milestoneId = disputeToMilestone[disputeId];
        Project storage proj = projects[projectId];
        Milestone storage milestone = proj.milestones[milestoneId];

        if (milestone.status != MilestoneStatus.Disputed) revert MilestoneNotDisputed();

        // ── Effects (all state changes before external calls) ──
        uint256 amount = milestone.amount;
        milestone.status = MilestoneStatus.Approved;
        proj.amountPaid += amount;

        uint256 clientAmount = (amount * clientShare) / 100;
        uint256 freelancerAmount = amount - clientAmount;

        uint256 fee = 0;
        uint256 freelancerPayment = freelancerAmount;
        if (freelancerAmount > 0) {
            fee = (freelancerAmount * platformFeeBps) / 10000;
            freelancerPayment = freelancerAmount - fee;
            accumulatedFees += fee;
        }

        if (_allMilestonesApproved(projectId)) {
            proj.status = ProjectStatus.Completed;
        }

        // ── Interactions ──
        if (clientAmount > 0) {
            STABLECOIN.safeTransfer(proj.client, clientAmount);
        }
        if (freelancerPayment > 0) {
            STABLECOIN.safeTransfer(proj.freelancer, freelancerPayment);
        }

        emit DisputeResolved(projectId, milestoneId, outcome);
    }

    // ============ View Functions ============

    function getProject(uint256 projectId) external view returns (Project memory) {
        return projects[projectId];
    }

    function getMilestone(uint256 projectId, uint256 milestoneId) external view returns (Milestone memory) {
        return projects[projectId].milestones[milestoneId];
    }

    function getMilestoneCount(uint256 projectId) external view returns (uint256) {
        return projects[projectId].milestones.length;
    }

    // ============ Internal ============

    function _allMilestonesApproved(uint256 projectId) internal view returns (bool) {
        Project storage proj = projects[projectId];
        for (uint256 i = 0; i < proj.milestones.length; i++) {
            if (proj.milestones[i].status != MilestoneStatus.Approved) return false;
        }
        return true;
    }

    // ============ Admin Functions ============

    function setDisputeJuryAddress(address _juryAddress) external onlyRole(ADMIN_ROLE) {
        if (disputeJuryAddress != address(0)) {
            _revokeRole(DISPUTE_RESOLVER_ROLE, disputeJuryAddress);
        }
        disputeJuryAddress = _juryAddress;
        if (_juryAddress != address(0)) {
            _grantRole(DISPUTE_RESOLVER_ROLE, _juryAddress);
        }
    }

    function setPlatformFeeBps(uint256 _feeBps) external onlyRole(ADMIN_ROLE) {
        require(_feeBps <= MAX_FEE_BPS, "Fee too high");
        platformFeeBps = _feeBps;
    }

    function withdrawFees(address to) external onlyRole(FEE_MANAGER_ROLE) {
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        STABLECOIN.safeTransfer(to, amount);
    }
}

interface IDisputeJury {
    function createDispute(uint256 projectId, uint256 milestoneId, address client, address freelancer, uint256 amount)
        external
        returns (uint256);
}
