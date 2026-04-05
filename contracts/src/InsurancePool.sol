// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/access/AccessControl.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

/**
 * @title InsurancePool V6
 * @notice Project insurance with premium-based coverage and claim validation
 * @dev policyCounter starts at 1 to avoid zero-ID mapping collision
 */
contract InsurancePool is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant CLAIM_VALIDATOR_ROLE = keccak256("CLAIM_VALIDATOR_ROLE");

    IERC20 public immutable stablecoin;

    uint256 public constant PREMIUM_PERCENTAGE = 5;
    uint256 public constant POLICY_DURATION = 90 days;

    /// @notice Starts at 1 to avoid zero-ID collision with default mapping values
    uint256 public policyCounter = 1;
    uint256 public totalPremiumsCollected;
    uint256 public totalClaimsPaid;
    uint256 public reserveRequirement; // Tracked reserve for active policies

    enum PolicyStatus {
        Active,
        Expired,
        Claimed
    }

    struct InsurancePolicy {
        address policyholder;
        uint256 projectId;
        uint256 coverageAmount;
        uint256 premiumPaid;
        uint256 startTime;
        uint256 expiryTime;
        PolicyStatus status;
        bool claimApproved; // Must be approved by validator before payout
    }

    mapping(uint256 => InsurancePolicy) public policies;
    mapping(uint256 => uint256) public projectToPolicy;
    mapping(address => uint256[]) public userPolicies;

    event InsurancePurchased(uint256 indexed policyId, address indexed policyholder, uint256 indexed projectId,
        uint256 coverageAmount, uint256 premium);
    event ClaimRequested(uint256 indexed policyId, uint256 claimAmount);
    event ClaimApproved(uint256 indexed policyId);
    event ClaimPaid(uint256 indexed policyId, address indexed recipient, uint256 amount);
    event PolicyExpired(uint256 indexed policyId);
    event PremiumWithdrawn(address indexed owner, uint256 amount);

    error InvalidProjectId();
    error PolicyAlreadyExists();
    error InvalidCoverageAmount();
    error InsufficientPoolBalance();
    error PolicyNotActive();
    error ClaimExceedsCoverage();
    error ClaimNotApproved();
    error NotPolicyholder();
    error Unauthorized();

    constructor(address _stablecoin) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(CLAIM_VALIDATOR_ROLE, msg.sender);

        stablecoin = IERC20(_stablecoin);
    }

    function buyInsurance(uint256 projectId, uint256 coverageAmount) external nonReentrant returns (uint256) {
        if (coverageAmount == 0) revert InvalidCoverageAmount();
        if (projectToPolicy[projectId] != 0) revert PolicyAlreadyExists();

        uint256 premium = (coverageAmount * PREMIUM_PERCENTAGE) / 100;
        stablecoin.safeTransferFrom(msg.sender, address(this), premium);

        uint256 policyId = policyCounter++;

        policies[policyId] = InsurancePolicy({
            policyholder: msg.sender,
            projectId: projectId,
            coverageAmount: coverageAmount,
            premiumPaid: premium,
            startTime: block.timestamp,
            expiryTime: block.timestamp + POLICY_DURATION,
            status: PolicyStatus.Active,
            claimApproved: false
        });

        projectToPolicy[projectId] = policyId;
        userPolicies[msg.sender].push(policyId);
        totalPremiumsCollected += premium;
        reserveRequirement += coverageAmount;

        emit InsurancePurchased(policyId, msg.sender, projectId, coverageAmount, premium);
        return policyId;
    }

    /// @notice Request a claim (must be approved by validator before payout)
    function requestClaim(uint256 policyId, uint256 claimAmount) external {
        InsurancePolicy storage policy = policies[policyId];
        if (msg.sender != policy.policyholder) revert NotPolicyholder();
        if (policy.status != PolicyStatus.Active) revert PolicyNotActive();
        if (block.timestamp > policy.expiryTime) revert PolicyNotActive();
        if (claimAmount > policy.coverageAmount) revert ClaimExceedsCoverage();

        emit ClaimRequested(policyId, claimAmount);
    }

    /// @notice Validator approves a claim after reviewing evidence
    function approveClaim(uint256 policyId) external onlyRole(CLAIM_VALIDATOR_ROLE) {
        InsurancePolicy storage policy = policies[policyId];
        if (policy.status != PolicyStatus.Active) revert PolicyNotActive();
        policy.claimApproved = true;
        emit ClaimApproved(policyId);
    }

    /// @notice Policyholder collects approved claim
    function collectClaim(uint256 policyId, uint256 claimAmount) external nonReentrant {
        InsurancePolicy storage policy = policies[policyId];
        if (msg.sender != policy.policyholder) revert NotPolicyholder();
        if (policy.status != PolicyStatus.Active) revert PolicyNotActive();
        if (!policy.claimApproved) revert ClaimNotApproved();
        if (claimAmount > policy.coverageAmount) revert ClaimExceedsCoverage();

        uint256 poolBalance = stablecoin.balanceOf(address(this));
        if (poolBalance < claimAmount) revert InsufficientPoolBalance();

        policy.status = PolicyStatus.Claimed;
        totalClaimsPaid += claimAmount;
        reserveRequirement -= policy.coverageAmount;

        stablecoin.safeTransfer(policy.policyholder, claimAmount);
        emit ClaimPaid(policyId, policy.policyholder, claimAmount);
    }

    function expirePolicy(uint256 policyId) external {
        InsurancePolicy storage policy = policies[policyId];
        if (policy.status == PolicyStatus.Active && block.timestamp > policy.expiryTime) {
            policy.status = PolicyStatus.Expired;
            reserveRequirement -= policy.coverageAmount;
            emit PolicyExpired(policyId);
        }
    }

    // ============ View Functions ============

    function getPolicy(uint256 policyId)
        external view
        returns (address, uint256, uint256, uint256, PolicyStatus, uint256, bool)
    {
        InsurancePolicy storage p = policies[policyId];
        return (p.policyholder, p.projectId, p.coverageAmount, p.premiumPaid, p.status, p.expiryTime, p.claimApproved);
    }

    function getUserPolicies(address user) external view returns (uint256[] memory) {
        return userPolicies[user];
    }

    function getPoolBalance() external view returns (uint256) {
        return stablecoin.balanceOf(address(this));
    }

    function getPoolMetrics()
        external view
        returns (uint256 premiumsCollected, uint256 claimsPaid, uint256 currentBalance, uint256 reserves)
    {
        return (totalPremiumsCollected, totalClaimsPaid, stablecoin.balanceOf(address(this)), reserveRequirement);
    }

    // ============ Admin ============

    /// @notice Withdraw only excess funds above reserve requirement
    function withdrawPremiums(uint256 amount) external onlyRole(ADMIN_ROLE) nonReentrant {
        uint256 available = stablecoin.balanceOf(address(this));
        require(available - amount >= reserveRequirement, "Cannot withdraw below reserve");
        stablecoin.safeTransfer(msg.sender, amount);
        emit PremiumWithdrawn(msg.sender, amount);
    }

    function setClaimValidator(address validator, bool status) external onlyRole(ADMIN_ROLE) {
        if (status) {
            _grantRole(CLAIM_VALIDATOR_ROLE, validator);
        } else {
            _revokeRole(CLAIM_VALIDATOR_ROLE, validator);
        }
    }
}
