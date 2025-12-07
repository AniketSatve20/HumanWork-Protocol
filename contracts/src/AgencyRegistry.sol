// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/access/Ownable.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "./UserRegistry.sol";

/**
 * @title AgencyRegistry V5
 * @notice B2B company registry with staking and GST verification
 * @dev Core B2B trust layer for Indian market GTM strategy
 */
contract AgencyRegistry is Ownable, ReentrancyGuard {
    // ============ State Variables ============
    
    IERC20 public immutable stablecoin;
    UserRegistry public immutable userRegistry;
    address public aiOracleAddress;
    
    uint256 public constant STAKE_AMOUNT = 500 * 10**6; // 500 USDC
    uint256 public agencyCounter;
    
    struct Agency {
        address owner;
        string companyName;
        bytes32 gstNumberHash;       // Hashed GST for privacy
        bool isGstVerified;         // Verified by AI Oracle
        uint256 stakeAmount;
        uint256 registeredAt;
        bool isActive;
        address[] team;             // Array of verified human employees
        mapping(address => bool) isTeamMember;
        mapping(address => uint256) teamMemberAddedAt;
    }
    
    // ============ Storage ============
    
    mapping(uint256 => Agency) public agencies;
    mapping(address => uint256) public ownerToAgency;
    mapping(bytes32 => bool) public gstHashUsed;
    
    // ============ Events ============
    
    event AgencyRegistered(
        uint256 indexed agencyId,
        address indexed owner,
        string companyName,
        bytes32 gstNumberHash,
        uint256 stakeAmount
    );
    event TeamMemberAdded(uint256 indexed agencyId, address indexed member);
    event TeamMemberRemoved(uint256 indexed agencyId, address indexed member);
    event GstVerificationStatusChanged(uint256 indexed agencyId, bool isVerified);
    event StakeWithdrawn(uint256 indexed agencyId, uint256 amount);
    event AgencyDeactivated(uint256 indexed agencyId);
    
    // ============ Errors ============
    
    error AlreadyRegistered();
    error InvalidStakeAmount();
    error GstAlreadyUsed();
    error NotAgencyOwner();
    error NotVerifiedHuman();
    error AlreadyTeamMember();
    error NotTeamMember();
    error AgencyNotActive();
    error Unauthorized();
    
    // ============ Modifiers ============
    
    modifier onlyAgencyOwner(uint256 agencyId) {
        if (agencies[agencyId].owner != msg.sender) revert NotAgencyOwner();
        _;
    }
    
    modifier onlyOracle() {
        if (msg.sender != aiOracleAddress) revert Unauthorized();
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        address _stablecoin,
        address _userRegistry
    ) Ownable(msg.sender) {
        stablecoin = IERC20(_stablecoin);
        userRegistry = UserRegistry(_userRegistry);
    }
    
    // ============ Agency Registration ============
    
    /**
     * @notice Register new agency with USDC stake
     * @param companyName Company name
     * @param gstHash Keccak256 hash of GST number (for privacy)
     * @return agencyId Newly created agency ID
     */
    function registerAgency(
        string memory companyName,
        bytes32 gstHash
    ) external nonReentrant returns (uint256) {
        if (ownerToAgency[msg.sender] != 0) revert AlreadyRegistered();
        if (gstHashUsed[gstHash]) revert GstAlreadyUsed();
        
        // Transfer 500 USDC stake
        require(
            stablecoin.transferFrom(msg.sender, address(this), STAKE_AMOUNT),
            "Stake transfer failed"
        );
        
        // Pre-increment so the first agencyId is 1, not 0
        uint256 agencyId = ++agencyCounter;
        
        Agency storage agency = agencies[agencyId];
        agency.owner = msg.sender;
        agency.companyName = companyName;
        agency.gstNumberHash = gstHash;
        agency.isGstVerified = false;
        agency.stakeAmount = STAKE_AMOUNT;
        agency.registeredAt = block.timestamp;
        agency.isActive = true;
        
        ownerToAgency[msg.sender] = agencyId;
        gstHashUsed[gstHash] = true;
        
        emit AgencyRegistered(agencyId, msg.sender, companyName, gstHash, STAKE_AMOUNT);
        
        return agencyId;
    }
    
    // ============ V5 TEAM MANAGEMENT (CRITICAL B2B FEATURE) ============
    
    /**
     * @notice Add verified human to agency team
     * @dev CRITICAL: Creates provable on-chain link between company and employees
     * @param user User address (must be verified human in UserRegistry)
     */
    function addTeamMember(address user) external {
        uint256 agencyId = ownerToAgency[msg.sender];
        if (agencyId == 0) revert NotAgencyOwner();
        
        Agency storage agency = agencies[agencyId];
        
        if (!agency.isActive) revert AgencyNotActive();
        if (agency.isTeamMember[user]) revert AlreadyTeamMember();
        
        // CRITICAL: Must be verified human
        if (!userRegistry.isVerifiedHuman(user)) revert NotVerifiedHuman();
        
        agency.team.push(user);
        agency.isTeamMember[user] = true;
        agency.teamMemberAddedAt[user] = block.timestamp;
        
        emit TeamMemberAdded(agencyId, user);
    }
    
    /**
     * @notice Remove team member
     * @param user User to remove
     */
    function removeTeamMember(address user) external {
        uint256 agencyId = ownerToAgency[msg.sender];
        if (agencyId == 0) revert NotAgencyOwner();
        
        Agency storage agency = agencies[agencyId];
        
        if (!agency.isTeamMember[user]) revert NotTeamMember();
        
        agency.isTeamMember[user] = false;
        delete agency.teamMemberAddedAt[user];
        
        // Remove from array
        for (uint256 i = 0; i < agency.team.length; i++) {
            if (agency.team[i] == user) {
                agency.team[i] = agency.team[agency.team.length - 1];
                agency.team.pop();
                break;
            }
        }
        
        emit TeamMemberRemoved(agencyId, user);
    }
    
    // ============ V5 GST VERIFICATION (INDIAN MARKET GTM) ============
    
    /**
     * @notice Set GST verification status
     * @dev ONLY callable by AI Oracle after off-chain document verification
     * @param agencyId Agency to verify
     * @param status Verification result
     */
    function setGstVerified(uint256 agencyId, bool status) external onlyOracle {
        agencies[agencyId].isGstVerified = status;
        emit GstVerificationStatusChanged(agencyId, status);
    }
    
    // ============ View Functions ============
    
    function getAgency(uint256 agencyId) external view returns (
        address owner,
        string memory companyName,
        bytes32 gstNumberHash,
        bool isGstVerified,
        uint256 stakeAmount,
        uint256 teamSize,
        bool isActive
    ) {
        Agency storage agency = agencies[agencyId];
        return (
            agency.owner,
            agency.companyName,
            agency.gstNumberHash,
            agency.isGstVerified,
            agency.stakeAmount,
            agency.team.length,
            agency.isActive
        );
    }
    
    function getTeamMembers(uint256 agencyId) external view returns (address[] memory) {
        return agencies[agencyId].team;
    }
    
    function isTeamMember(uint256 agencyId, address user) external view returns (bool) {
        return agencies[agencyId].isTeamMember[user];
    }
    
    function getAgencyIdByOwner(address owner) external view returns (uint256) {
        return ownerToAgency[owner];
    }
    
    // ============ Admin Functions ============
    
    function setAiOracle(address _aiOracle) external onlyOwner {
        aiOracleAddress = _aiOracle;
    }
    
    function deactivateAgency(uint256 agencyId) external onlyOwner {
        agencies[agencyId].isActive = false;
        emit AgencyDeactivated(agencyId);
    }
}
