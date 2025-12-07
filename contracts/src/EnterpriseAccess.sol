// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "./AgencyRegistry.sol";

/**
 * @title EnterpriseAccess V5
 * @notice Dual-Sided SaaS NFT Subscription
 * @dev Sells Client NFTs and Agency NFTs
 */
contract EnterpriseAccess is ERC721, Ownable, ReentrancyGuard {
    // ============ State Variables ============

    IERC20 public immutable stablecoin;
    AgencyRegistry public immutable agencyRegistry;

    uint256 public constant CLIENT_MONTHLY_FEE = 500 * 10**6;
    uint256 public constant CLIENT_ANNUAL_FEE = 5000 * 10**6;
    uint256 public constant AGENCY_MONTHLY_FEE = 100 * 10**6;
    uint256 public constant AGENCY_ANNUAL_FEE = 1000 * 10**6;

    uint256 public subscriptionCounter;

    enum Tier {
        None,
        ClientMonthly,
        ClientAnnual,
        AgencyMonthly,
        AgencyAnnual
    }

    enum SubscriptionStatus {
        Active,
        GracePeriod,
        Expired,
        Cancelled
    }

    struct Subscription {
        address admin;
        string companyName;
        Tier tier;
        SubscriptionStatus status;
        uint256 startTime;
        uint256 expiryTime;
        address[] managers;
        mapping(address => bool) isManager;
    }

    // ============ Storage ============

    mapping(uint256 => Subscription) public subscriptions;
    mapping(address => uint256) public adminToSubscription;
    mapping(address => bool) public enterpriseUsers; // Admin or Manager

    // ============ Events ============

    event SubscriptionCreated(uint256 indexed subscriptionId, address indexed admin, Tier tier);
    event SubscriptionRenewed(uint256 indexed subscriptionId, uint256 newExpiry);
    event ManagerAdded(uint256 indexed subscriptionId, address indexed manager);
    event ManagerRemoved(uint256 indexed subscriptionId, address indexed manager);

    // ============ Errors ============

    error AlreadyHasSubscription();
    error InvalidTier();
    error NotAdmin();
    error SubscriptionExpired();
    error ManagerAlreadyExists();
    error ManagerNotFound();

    // ============ Constructor ============

    constructor(
        address _stablecoin,
        address _agencyRegistry
    ) ERC721("HumanWork Enterprise", "HWENT") Ownable(msg.sender) {
        stablecoin = IERC20(_stablecoin);
        agencyRegistry = AgencyRegistry(_agencyRegistry);
    }

    // ============ External Functions ============

    function subscribe(
        Tier tier,
        string calldata companyName
    ) external nonReentrant returns (uint256) {
        if (adminToSubscription[msg.sender] != 0) revert AlreadyHasSubscription();

        uint256 fee = _getTierFee(tier);
        uint256 duration = _getTierDuration(tier);
        if (fee == 0) revert InvalidTier();

        require(
            stablecoin.transferFrom(msg.sender, address(this), fee),
            "Payment failed"
        );

        uint256 subscriptionId = ++subscriptionCounter;

        _safeMint(msg.sender, subscriptionId);

        Subscription storage sub = subscriptions[subscriptionId];
        sub.admin = msg.sender;
        sub.companyName = companyName;
        sub.tier = tier;
        sub.status = SubscriptionStatus.Active;
        sub.startTime = block.timestamp;
        sub.expiryTime = block.timestamp + duration;

        adminToSubscription[msg.sender] = subscriptionId;
        enterpriseUsers[msg.sender] = true;

        emit SubscriptionCreated(subscriptionId, msg.sender, tier);
        return subscriptionId;
    }

    function renewSubscription() external nonReentrant {
        uint256 subscriptionId = adminToSubscription[msg.sender];
        if (subscriptionId == 0) revert NotAdmin();

        Subscription storage sub = subscriptions[subscriptionId];
        
        uint256 fee = _getTierFee(sub.tier);
        uint256 duration = _getTierDuration(sub.tier);

        require(
            stablecoin.transferFrom(msg.sender, address(this), fee),
            "Payment failed"
        );

        // Extend from current expiry or now, whichever is later
        uint256 startPoint = sub.expiryTime > block.timestamp ? sub.expiryTime : block.timestamp;
        sub.expiryTime = startPoint + duration;
        sub.status = SubscriptionStatus.Active;

        emit SubscriptionRenewed(subscriptionId, sub.expiryTime);
    }

    function addManager(address manager) external {
        uint256 subscriptionId = adminToSubscription[msg.sender];
        if (subscriptionId == 0) revert NotAdmin();

        Subscription storage sub = subscriptions[subscriptionId];
        if (sub.status != SubscriptionStatus.Active) revert SubscriptionExpired();
        if (sub.isManager[manager]) revert ManagerAlreadyExists();

        sub.managers.push(manager);
        sub.isManager[manager] = true;
        enterpriseUsers[manager] = true;

        emit ManagerAdded(subscriptionId, manager);
    }

    function removeManager(address manager) external {
        uint256 subscriptionId = adminToSubscription[msg.sender];
        if (subscriptionId == 0) revert NotAdmin();

        Subscription storage sub = subscriptions[subscriptionId];
        if (!sub.isManager[manager]) revert ManagerNotFound();

        sub.isManager[manager] = false;
        enterpriseUsers[manager] = false;

        for (uint256 i = 0; i < sub.managers.length; i++) {
            if (sub.managers[i] == manager) {
                sub.managers[i] = sub.managers[sub.managers.length - 1];
                sub.managers.pop();
                break;
            }
        }
        emit ManagerRemoved(subscriptionId, manager);
    }

    // ============ V5 INTEGRATION FUNCTIONS ============

    function recordProjectCreated(address user, uint256 projectValue) external {
        // Stub for analytics - validates enterprise user
        bytes32(projectValue); // Suppress unused variable warning
        require(enterpriseUsers[user], "Not enterprise user");
    }

    // ============ View Functions ============

    function isEnterpriseUser(address user) external view returns (bool) {
        return enterpriseUsers[user];
    }
    
    function isAgencySubscriber(address user) external view returns (bool) {
        uint256 subId = adminToSubscription[user];
        if (subId == 0) return false;
        Tier tier = subscriptions[subId].tier;
        return (tier == Tier.AgencyMonthly || tier == Tier.AgencyAnnual);
    }

    function getSubscription(uint256 subscriptionId) external view returns (
        address admin,
        string memory companyName,
        Tier tier,
        SubscriptionStatus status,
        uint256 startTime,
        uint256 expiryTime,
        uint256 managerCount
    ) {
        Subscription storage sub = subscriptions[subscriptionId];
        return (
            sub.admin,
            sub.companyName,
            sub.tier,
            sub.status,
            sub.startTime,
            sub.expiryTime,
            sub.managers.length
        );
    }

    function getManagers(uint256 subscriptionId) external view returns (address[] memory) {
        return subscriptions[subscriptionId].managers;
    }

    function isSubscriptionActive(address user) external view returns (bool) {
        uint256 subId = adminToSubscription[user];
        if (subId == 0) return false;
        return subscriptions[subId].expiryTime > block.timestamp;
    }
    
    // ============ Internal Functions ============

    function _getTierFee(Tier tier) internal pure returns (uint256) {
        if (tier == Tier.ClientMonthly) return CLIENT_MONTHLY_FEE;
        if (tier == Tier.ClientAnnual) return CLIENT_ANNUAL_FEE;
        if (tier == Tier.AgencyMonthly) return AGENCY_MONTHLY_FEE;
        if (tier == Tier.AgencyAnnual) return AGENCY_ANNUAL_FEE;
        return 0;
    }

    function _getTierDuration(Tier tier) internal pure returns (uint256) {
        if (tier == Tier.ClientMonthly) return 30 days;
        if (tier == Tier.ClientAnnual) return 365 days;
        if (tier == Tier.AgencyMonthly) return 30 days;
        if (tier == Tier.AgencyAnnual) return 365 days;
        return 0;
    }

    // ============ Admin Functions ============

    function withdrawFees(address to) external onlyOwner {
        uint256 balance = stablecoin.balanceOf(address(this));
        require(stablecoin.transfer(to, balance), "Withdrawal failed");
    }
}
