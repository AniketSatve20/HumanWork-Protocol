// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";
import "./UserRegistry.sol";

/**
 * @title DisputeJury V5
 * @notice Decentralized jury with AI-PM report as primary evidence
 * @dev Court of appeals with 3-way voting (AcceptAI, SideWithClient, SideWithFreelancer)
 */
contract DisputeJury is ReentrancyGuard, Ownable {
    IERC20 public immutable STABLECOIN;
    UserRegistry public immutable USER_REGISTRY;
    address public projectEscrowAddress;
    
    uint256 public constant MIN_STAKE = 100 * 10**6;
    uint256 public constant JURORS_PER_CASE = 5;
    uint256 public constant VOTING_PERIOD = 7 days;
    
    uint256 public disputeCounter;
    
    enum DisputeOutcome { Pending, AcceptAISplit, ClientWins, FreelancerWins }
    enum VoteChoice { AcceptAI, SideWithClient, SideWithFreelancer }
    
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
        DisputeOutcome outcome;
        uint256 createdAt;
        uint256 resolvedAt;
        bool fundsDistributed;
        string aiReport;
        uint8 aiRecommendedSplit;
    }
    
    struct JurorInfo {
        uint256 stakedAmount;
        uint256 casesJudged;
        uint256 reputationScore;
        bool isActive;
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
    event RewardDistributed(address indexed juror, uint256 amount);
    
    error NotVerifiedHuman();
    error InsufficientStake();
    error AlreadyVoted();
    error VotingEnded();
    error VotingNotEnded();
    error NotJurorInCase();
    error FundsAlreadyDistributed();
    error NotEnoughJurors();
    error Unauthorized();
    
    constructor(address _stablecoin, address _userRegistry) Ownable(msg.sender) {
        STABLECOIN = IERC20(_stablecoin);
        USER_REGISTRY = UserRegistry(_userRegistry);
    }
    
    function stakeAsJuror(uint256 amount) external nonReentrant {
        if (!USER_REGISTRY.isVerifiedHuman(msg.sender)) revert NotVerifiedHuman();
        if (amount < MIN_STAKE) revert InsufficientStake();
        require(STABLECOIN.transferFrom(msg.sender, address(this), amount), "Stake transfer failed");
        
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
        require(STABLECOIN.transfer(msg.sender, amount), "Unstake failed");
        emit JurorUnstaked(msg.sender, amount);
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
    
    function createDispute(uint256 projectId, uint256 milestoneIndex, address client, address freelancer, uint256 amount) external returns (uint256) {
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
        dispute.jurors = _selectJurors();
        
        emit DisputeCreated(disputeId, projectId, milestoneIndex);
        return disputeId;
    }
    
    function setAiReport(uint256 disputeId, string memory report, uint8 recommendedSplit) external {
        if (msg.sender != projectEscrowAddress && msg.sender != owner()) revert Unauthorized();
        disputes[disputeId].aiReport = report;
        disputes[disputeId].aiRecommendedSplit = recommendedSplit;
    }
    
    function castVote(uint256 disputeId, VoteChoice choice) external {
        Dispute storage dispute = disputes[disputeId];
        if (block.timestamp > dispute.createdAt + VOTING_PERIOD) revert VotingEnded();
        if (dispute.hasVoted[msg.sender]) revert AlreadyVoted();
        if (!_isJurorInCase(disputeId, msg.sender)) revert NotJurorInCase();
        
        dispute.hasVoted[msg.sender] = true;
        dispute.votes[msg.sender] = choice;
        
        if (choice == VoteChoice.AcceptAI) dispute.votesAcceptAi++;
        else if (choice == VoteChoice.SideWithClient) dispute.votesForClient++;
        else dispute.votesForFreelancer++;
        
        emit VoteCast(disputeId, msg.sender, choice);
        
        if (dispute.votesAcceptAi + dispute.votesForClient + dispute.votesForFreelancer == JURORS_PER_CASE) {
            _tallyVotes(disputeId);
        }
    }
    
    function finalizeDispute(uint256 disputeId) external {
        Dispute storage dispute = disputes[disputeId];
        if (block.timestamp <= dispute.createdAt + VOTING_PERIOD) revert VotingNotEnded();
        if (dispute.outcome != DisputeOutcome.Pending) return;
        _tallyVotes(disputeId);
    }
    
    function _tallyVotes(uint256 disputeId) internal {
        Dispute storage dispute = disputes[disputeId];
        if (dispute.votesAcceptAi >= dispute.votesForClient && dispute.votesAcceptAi >= dispute.votesForFreelancer) {
            dispute.outcome = DisputeOutcome.AcceptAISplit;
        } else if (dispute.votesForClient > dispute.votesForFreelancer) {
            dispute.outcome = DisputeOutcome.ClientWins;
        } else {
            dispute.outcome = DisputeOutcome.FreelancerWins;
        }
        dispute.resolvedAt = block.timestamp;
        emit DisputeResolved(disputeId, dispute.outcome);
    }
    
    function _selectJurors() internal view returns (address[] memory) {
        address[] memory selected = new address[](JURORS_PER_CASE);
        uint256 count = 0;
        uint256 startIndex = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % activeJurors.length;
        for (uint256 i = 0; i < activeJurors.length && count < JURORS_PER_CASE; i++) {
            uint256 index = (startIndex + i) % activeJurors.length;
            address juror = activeJurors[index];
            if (jurors[juror].isActive && jurors[juror].stakedAmount >= MIN_STAKE) {
                selected[count++] = juror;
            }
        }
        return selected;
    }
    
    function _isJurorInCase(uint256 disputeId, address juror) internal view returns (bool) {
        address[] storage jurorList = disputes[disputeId].jurors;
        for (uint256 i = 0; i < jurorList.length; i++) {
            if (jurorList[i] == juror) return true;
        }
        return false;
    }
    
    function getDispute(uint256 disputeId) external view returns (uint256, address, address, uint256, DisputeOutcome, uint256, uint256, uint256, string memory) {
        Dispute storage d = disputes[disputeId];
        return (d.projectId, d.client, d.freelancer, d.amount, d.outcome, d.votesAcceptAi, d.votesForClient, d.votesForFreelancer, d.aiReport);
    }
    
    function getJurorInfo(address juror) external view returns (uint256, uint256, uint256, bool) {
        JurorInfo storage info = jurors[juror];
        return (info.stakedAmount, info.casesJudged, info.reputationScore, info.isActive);
    }
    
    function getActiveJurorCount() external view returns (uint256) { return activeJurors.length; }
    function getDisputeJurors(uint256 disputeId) external view returns (address[] memory) { return disputes[disputeId].jurors; }
    
    function setProjectEscrowAddress(address _projectEscrow) external onlyOwner {
        require(projectEscrowAddress == address(0), "Already set");
        projectEscrowAddress = _projectEscrow;
    }
}
