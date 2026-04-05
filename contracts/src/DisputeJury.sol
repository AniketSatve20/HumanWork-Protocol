// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "openzeppelin-contracts/contracts/access/AccessControl.sol";
import "./UserRegistry.sol";

interface IProjectEscrow {
    function resolveDispute(uint256 disputeId, uint8 outcome, uint8 clientShare, uint8 freelancerShare) external;
}

/**
 * @title DisputeJury V6
 * @notice Decentralized jury with AI-PM report, fund distribution, and juror incentives
 * @dev 5 jurors vote → majority wins → funds distributed via ProjectEscrow callback
 */
contract DisputeJury is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant AI_ORACLE_ROLE = keccak256("AI_ORACLE_ROLE");

    IERC20 public immutable STABLECOIN;
    UserRegistry public immutable USER_REGISTRY;
    address public projectEscrowAddress;

    uint256 public constant MIN_STAKE = 100 * 10 ** 6;   // 100 USDC
    uint256 public constant JURORS_PER_CASE = 5;
    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant JUROR_REWARD = 10 * 10 ** 6;  // 10 USDC per case

    uint256 public disputeCounter;

    enum DisputeOutcome {
        Pending,
        AcceptAISplit,
        ClientWins,
        FreelancerWins
    }

    enum VoteChoice {
        AcceptAI,
        SideWithClient,
        SideWithFreelancer
    }

    struct Dispute {
        uint256 projectId;
        uint256 milestoneIndex;
        address client;
        address freelancer;
        uint256 amount;
        address[] jurors;
        mapping(address => bool) hasVoted;
        mapping(address => VoteChoice) votes;
        uint256 votesAcceptAi;
        uint256 votesForClient;
        uint256 votesForFreelancer;
        uint256 totalVotes;
        DisputeOutcome outcome;
        uint256 createdAt;
        uint256 resolvedAt;
        bool fundsDistributed;
        string aiReport;
        uint8 aiRecommendedSplit; // 0-100 (% to freelancer)
    }

    struct JurorInfo {
        uint256 stakedAmount;
        uint256 casesJudged;
        uint256 reputationScore; // 0-200 scale, starts at 100
        bool isActive;
        uint256 totalRewards;
    }

    mapping(uint256 => Dispute) public disputes;
    mapping(address => JurorInfo) public jurors;
    address[] public activeJurors;
    mapping(address => uint256) public jurorIndices;

    event DisputeCreated(uint256 indexed disputeId, uint256 projectId, uint256 milestoneIndex);
    event JurorStaked(address indexed juror, uint256 amount);
    event JurorUnstaked(address indexed juror, uint256 amount);
    event VoteCast(uint256 indexed disputeId, address indexed juror, VoteChoice choice);
    event DisputeResolved(uint256 indexed disputeId, DisputeOutcome outcome);
    event JurorRewarded(address indexed juror, uint256 amount);
    event AiReportSet(uint256 indexed disputeId);

    error NotVerifiedHuman();
    error InsufficientStake();
    error AlreadyVoted();
    error VotingEnded();
    error VotingNotEnded();
    error NotJurorInCase();
    error NotEnoughJurors();
    error AlreadyResolved();
    error Unauthorized();
    error MinimumVotesNotMet();

    constructor(address _stablecoin, address _userRegistry) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(AI_ORACLE_ROLE, msg.sender);

        STABLECOIN = IERC20(_stablecoin);
        USER_REGISTRY = UserRegistry(_userRegistry);
    }

    // ============ Juror Staking ============

    function stakeAsJuror(uint256 amount) external nonReentrant {
        if (!USER_REGISTRY.isVerifiedHuman(msg.sender)) revert NotVerifiedHuman();
        if (amount < MIN_STAKE) revert InsufficientStake();
        STABLECOIN.safeTransferFrom(msg.sender, address(this), amount);

        JurorInfo storage juror = jurors[msg.sender];
        if (!juror.isActive) {
            jurorIndices[msg.sender] = activeJurors.length;
            activeJurors.push(msg.sender);
            if (juror.reputationScore == 0) juror.reputationScore = 100;
            juror.isActive = true;
        }
        juror.stakedAmount += amount;
        emit JurorStaked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant {
        JurorInfo storage juror = jurors[msg.sender];
        if (juror.stakedAmount < amount) revert InsufficientStake();
        juror.stakedAmount -= amount;
        if (juror.stakedAmount < MIN_STAKE && juror.isActive) {
            _removeJuror(msg.sender);
            juror.isActive = false;
        }
        STABLECOIN.safeTransfer(msg.sender, amount);
        emit JurorUnstaked(msg.sender, amount);
    }

    // ============ Dispute Lifecycle ============

    function createDispute(
        uint256 projectId,
        uint256 milestoneIndex,
        address client,
        address freelancer,
        uint256 amount
    ) external returns (uint256) {
        require(msg.sender == projectEscrowAddress, "Only ProjectEscrow");
        if (activeJurors.length < JURORS_PER_CASE) revert NotEnoughJurors();

        uint256 disputeId = disputeCounter++;
        Dispute storage dispute = disputes[disputeId];
        dispute.projectId = projectId;
        dispute.milestoneIndex = milestoneIndex;
        dispute.client = client;
        dispute.freelancer = freelancer;
        dispute.amount = amount;
        dispute.outcome = DisputeOutcome.Pending;
        dispute.createdAt = block.timestamp;
        dispute.aiRecommendedSplit = 50;
        dispute.jurors = _selectJurors(client, freelancer);

        emit DisputeCreated(disputeId, projectId, milestoneIndex);
        return disputeId;
    }

    function setAiReport(uint256 disputeId, string memory report, uint8 recommendedSplit) external onlyRole(AI_ORACLE_ROLE) {
        require(recommendedSplit <= 100, "Split must be 0-100");
        disputes[disputeId].aiReport = report;
        disputes[disputeId].aiRecommendedSplit = recommendedSplit;
        emit AiReportSet(disputeId);
    }

    function castVote(uint256 disputeId, VoteChoice choice) external {
        Dispute storage dispute = disputes[disputeId];
        if (dispute.outcome != DisputeOutcome.Pending) revert AlreadyResolved();
        if (block.timestamp > dispute.createdAt + VOTING_PERIOD) revert VotingEnded();
        if (dispute.hasVoted[msg.sender]) revert AlreadyVoted();
        if (!_isJurorInCase(disputeId, msg.sender)) revert NotJurorInCase();

        dispute.hasVoted[msg.sender] = true;
        dispute.votes[msg.sender] = choice;
        dispute.totalVotes++;

        if (choice == VoteChoice.AcceptAI) dispute.votesAcceptAi++;
        else if (choice == VoteChoice.SideWithClient) dispute.votesForClient++;
        else dispute.votesForFreelancer++;

        emit VoteCast(disputeId, msg.sender, choice);

        // Auto-finalize if all jurors voted
        if (dispute.totalVotes == JURORS_PER_CASE) {
            _finalizeAndDistribute(disputeId);
        }
    }

    function finalizeDispute(uint256 disputeId) external {
        Dispute storage dispute = disputes[disputeId];
        if (block.timestamp <= dispute.createdAt + VOTING_PERIOD) revert VotingNotEnded();
        if (dispute.outcome != DisputeOutcome.Pending) revert AlreadyResolved();
        // Require at least 3 votes (majority of 5)
        if (dispute.totalVotes < 3) revert MinimumVotesNotMet();
        _finalizeAndDistribute(disputeId);
    }

    // ============ Internal ============

    function _finalizeAndDistribute(uint256 disputeId) internal {
        Dispute storage dispute = disputes[disputeId];

        // Tally votes
        DisputeOutcome outcome;
        uint8 clientShare;
        uint8 freelancerShare;

        if (dispute.votesForClient > dispute.votesForFreelancer && dispute.votesForClient > dispute.votesAcceptAi) {
            outcome = DisputeOutcome.ClientWins;
            clientShare = 100;
            freelancerShare = 0;
        } else if (dispute.votesForFreelancer > dispute.votesForClient && dispute.votesForFreelancer > dispute.votesAcceptAi) {
            outcome = DisputeOutcome.FreelancerWins;
            clientShare = 0;
            freelancerShare = 100;
        } else {
            // AcceptAI wins or tie → use AI recommended split
            outcome = DisputeOutcome.AcceptAISplit;
            freelancerShare = dispute.aiRecommendedSplit;
            clientShare = 100 - freelancerShare;
        }

        dispute.outcome = outcome;
        dispute.resolvedAt = block.timestamp;
        dispute.fundsDistributed = true;

        // Callback to ProjectEscrow to distribute funds
        IProjectEscrow(projectEscrowAddress).resolveDispute(
            disputeId, uint8(outcome), clientShare, freelancerShare
        );

        // Reward jurors who voted with majority & update reputation
        _rewardJurors(disputeId, outcome);

        emit DisputeResolved(disputeId, outcome);
    }

    function _rewardJurors(uint256 disputeId, DisputeOutcome outcome) internal {
        Dispute storage dispute = disputes[disputeId];
        VoteChoice winningChoice;

        if (outcome == DisputeOutcome.ClientWins) winningChoice = VoteChoice.SideWithClient;
        else if (outcome == DisputeOutcome.FreelancerWins) winningChoice = VoteChoice.SideWithFreelancer;
        else winningChoice = VoteChoice.AcceptAI;

        for (uint256 i = 0; i < dispute.jurors.length; i++) {
            address jurorAddr = dispute.jurors[i];
            JurorInfo storage juror = jurors[jurorAddr];
            juror.casesJudged++;

            if (dispute.hasVoted[jurorAddr]) {
                if (dispute.votes[jurorAddr] == winningChoice) {
                    // Majority voter: reward + reputation boost
                    juror.reputationScore = juror.reputationScore < 195 ? juror.reputationScore + 5 : 200;
                    juror.totalRewards += JUROR_REWARD;
                    // Note: rewards paid from contract's stablecoin balance (from stakes pool)
                } else {
                    // Minority voter: reputation penalty (no slashing to keep it simple)
                    juror.reputationScore = juror.reputationScore > 5 ? juror.reputationScore - 5 : 0;
                }
            } else {
                // Didn't vote: larger reputation penalty
                juror.reputationScore = juror.reputationScore > 10 ? juror.reputationScore - 10 : 0;
            }
        }
    }

    function _selectJurors(address client, address freelancer) internal view returns (address[] memory) {
        address[] memory selected = new address[](JURORS_PER_CASE);
        uint256 count = 0;
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, disputeCounter)));

        for (uint256 i = 0; i < activeJurors.length && count < JURORS_PER_CASE; i++) {
            uint256 index = (seed + i * 7) % activeJurors.length; // spread selection
            address juror = activeJurors[index];
            // Exclude conflict of interest
            if (juror == client || juror == freelancer) continue;
            if (!jurors[juror].isActive || jurors[juror].stakedAmount < MIN_STAKE) continue;

            // Check not already selected
            bool alreadySelected = false;
            for (uint256 j = 0; j < count; j++) {
                if (selected[j] == juror) { alreadySelected = true; break; }
            }
            if (!alreadySelected) {
                selected[count++] = juror;
            }
        }
        require(count == JURORS_PER_CASE, "Not enough eligible jurors");
        return selected;
    }

    function _removeJuror(address jurorToRemove) internal {
        uint256 index = jurorIndices[jurorToRemove];
        uint256 lastIndex = activeJurors.length - 1;
        if (index != lastIndex) {
            address lastJuror = activeJurors[lastIndex];
            activeJurors[index] = lastJuror;
            jurorIndices[lastJuror] = index;
        }
        activeJurors.pop();
        delete jurorIndices[jurorToRemove];
    }

    function _isJurorInCase(uint256 disputeId, address juror) internal view returns (bool) {
        address[] storage jurorList = disputes[disputeId].jurors;
        for (uint256 i = 0; i < jurorList.length; i++) {
            if (jurorList[i] == juror) return true;
        }
        return false;
    }

    // ============ View Functions ============

    function getDispute(uint256 disputeId)
        external
        view
        returns (uint256, address, address, uint256, DisputeOutcome, uint256, uint256, uint256, string memory)
    {
        Dispute storage d = disputes[disputeId];
        return (
            d.projectId, d.client, d.freelancer, d.amount, d.outcome,
            d.votesAcceptAi, d.votesForClient, d.votesForFreelancer, d.aiReport
        );
    }

    function getJurorInfo(address juror) external view returns (uint256, uint256, uint256, bool, uint256) {
        JurorInfo storage info = jurors[juror];
        return (info.stakedAmount, info.casesJudged, info.reputationScore, info.isActive, info.totalRewards);
    }

    function getActiveJurorCount() external view returns (uint256) {
        return activeJurors.length;
    }

    function getDisputeJurors(uint256 disputeId) external view returns (address[] memory) {
        return disputes[disputeId].jurors;
    }

    // ============ Admin ============

    function setProjectEscrowAddress(address _projectEscrow) external onlyRole(ADMIN_ROLE) {
        projectEscrowAddress = _projectEscrow;
    }
}
