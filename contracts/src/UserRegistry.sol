// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/access/Ownable.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IZKVerifier.sol";

/**
 * @title UserRegistry V5
 * @notice Attestation-based identity hub for verified humans
 * @dev Core identity layer with ZK-KYC and on-chain reputation system
 *
 * KEY FEATURES:
 * - Tiered legitimacy: None → Basic → VerifiedHuman
 * - ZK-KYC verification (privacy-preserving)
 * - On-chain attestation system (SKILL, PROJECT, NEGATIVE)
 * - ENS integration
 * - Gas sponsorship deposit
 */
contract UserRegistry is Ownable {
    // ============ State Variables ============

    IZKVerifier public zkVerifier;
    IERC20 public stablecoin;
    address public gasSponsorAddress;

    uint256 public constant DEPOSIT_AMOUNT = 10 * 10 ** 6; // 10 USDC (6 decimals)
    uint256 public attestationCounter;

    enum LegitimacyLevel {
        None, // 0 - Not registered
        Basic, // 1 - Email verified (off-chain)
        VerifiedHuman // 2 - ZK-KYC completed
    }

    enum AttestationType {
        SKILL, // Skill badge earned
        PROJECT, // Project completed successfully
        NEGATIVE // Bad behavior (cancellation, dispute loss)
    }

    struct UserProfile {
        LegitimacyLevel level;
        string ensName;
        bool hasDeposited;
        uint256 registrationTime;
        bytes32 zkProofHash;
    }

    struct Attestation {
        uint256 attestationId;
        AttestationType attestationType;
        uint256 referenceId; // skillTestId or projectId
        uint256 timestamp;
        address issuer; // Contract that issued attestation
        string metadata; // Optional JSON metadata
        bool isPositive; // false for negative attestations
    }

    // ============ Storage ============

    mapping(address => UserProfile) public users;
    mapping(bytes32 => bool) public usedProofs; // Prevent proof replay
    mapping(string => address) public ensToAddress;
    mapping(address => Attestation[]) public attestations;
    mapping(address => bool) public authorizedCallers; // Contracts that can add attestations

    // ============ Events ============

    event UserRegistered(address indexed user, LegitimacyLevel level);
    event HumanVerified(address indexed user, bytes32 proofHash);
    event ENSLinked(address indexed user, string ensName);
    event DepositMade(address indexed user, uint256 amount);
    event AttestationAdded(
        address indexed user,
        uint256 attestationId,
        AttestationType attestationType,
        uint256 referenceId,
        address issuer,
        bool isPositive
    );
    event AuthorizedCallerUpdated(address indexed caller, bool status);

    // ============ Errors ============

    error AlreadyRegistered();
    error InvalidProof();
    error ProofAlreadyUsed();
    error NotBasicUser();
    error ENSAlreadyLinked();
    error DepositAlreadyMade();
    error InsufficientAllowance();
    error Unauthorized();

    // ============ Modifiers ============

    modifier onlyAuthorized() {
        if (!authorizedCallers[msg.sender]) revert Unauthorized();
        _;
    }

    // ============ Constructor ============

    constructor(address _zkVerifier, address _stablecoin, address _gasSponsor) Ownable(msg.sender) {
        zkVerifier = IZKVerifier(_zkVerifier);
        stablecoin = IERC20(_stablecoin);
        gasSponsorAddress = _gasSponsor;
    }

    // ============ Registration Functions ============

    /**
     * @notice Register as basic user (Level 1)
     * @dev Called after off-chain email verification
     */
    function registerBasic() external {
        if (users[msg.sender].level != LegitimacyLevel.None) {
            revert AlreadyRegistered();
        }

        users[msg.sender] = UserProfile({
            level: LegitimacyLevel.Basic,
            ensName: "",
            hasDeposited: false,
            registrationTime: block.timestamp,
            zkProofHash: bytes32(0)
        });

        emit UserRegistered(msg.sender, LegitimacyLevel.Basic);
    }

    /**
     * @notice Upgrade to verified human (Level 2) via ZK-KYC
     * @param zkProof Zero-knowledge proof of identity
     * @param publicSignals Public inputs to ZK circuit
     */
    function verifyHuman(bytes memory zkProof, uint256[] memory publicSignals) external {
        if (users[msg.sender].level != LegitimacyLevel.Basic) {
            revert NotBasicUser();
        }

        // Verify ZK proof
        if (!zkVerifier.verifyProof(zkProof, publicSignals)) {
            revert InvalidProof();
        }

        // Prevent proof replay attacks
        bytes32 proofHash = keccak256(zkProof);
        if (usedProofs[proofHash]) {
            revert ProofAlreadyUsed();
        }

        usedProofs[proofHash] = true;
        users[msg.sender].level = LegitimacyLevel.VerifiedHuman;
        users[msg.sender].zkProofHash = proofHash;

        emit HumanVerified(msg.sender, proofHash);
        emit UserRegistered(msg.sender, LegitimacyLevel.VerifiedHuman);
    }

    /**
     * @notice Link ENS name to profile
     * @param ensName ENS name (e.g., "alice.eth")
     */
    function linkEns(string memory ensName) external {
        if (users[msg.sender].level == LegitimacyLevel.None) {
            revert NotBasicUser();
        }
        if (bytes(users[msg.sender].ensName).length > 0) {
            revert ENSAlreadyLinked();
        }
        if (ensToAddress[ensName] != address(0)) {
            revert ENSAlreadyLinked();
        }

        users[msg.sender].ensName = ensName;
        ensToAddress[ensName] = msg.sender;

        emit ENSLinked(msg.sender, ensName);
    }

    /**
     * @notice Make one-time deposit for gas sponsorship
     */
    function makeDeposit() external {
        if (users[msg.sender].hasDeposited) {
            revert DepositAlreadyMade();
        }

        uint256 allowance = stablecoin.allowance(msg.sender, address(this));
        if (allowance < DEPOSIT_AMOUNT) {
            revert InsufficientAllowance();
        }

        require(stablecoin.transferFrom(msg.sender, gasSponsorAddress, DEPOSIT_AMOUNT), "Transfer failed");

        users[msg.sender].hasDeposited = true;

        emit DepositMade(msg.sender, DEPOSIT_AMOUNT);
    }

    // ============ V5 ATTESTATION SYSTEM ============

    /**
     * @notice Add attestation to user's on-chain record
     * @dev Only authorized contracts can call (ProjectEscrow, SkillTrial)
     * @param user User receiving attestation
     * @param attestationType Type of attestation
     * @param referenceId ID of skill test or project
     */
    function addAttestation(address user, AttestationType attestationType, uint256 referenceId)
        external
        onlyAuthorized
    {
        _addAttestation(user, attestationType, referenceId, "", true);
    }

    /**
     * @notice Add attestation with metadata
     * @param user User receiving attestation
     * @param attestationType Type of attestation
     * @param referenceId Reference ID
     * @param metadata JSON metadata
     * @param isPositive True for positive, false for negative
     */
    function addAttestationWithMetadata(
        address user,
        AttestationType attestationType,
        uint256 referenceId,
        string memory metadata,
        bool isPositive
    ) external onlyAuthorized {
        _addAttestation(user, attestationType, referenceId, metadata, isPositive);
    }

    function _addAttestation(
        address user,
        AttestationType attestationType,
        uint256 referenceId,
        string memory metadata,
        bool isPositive
    ) internal {
        uint256 attId = attestationCounter++;

        attestations[user].push(
            Attestation({
                attestationId: attId,
                attestationType: attestationType,
                referenceId: referenceId,
                timestamp: block.timestamp,
                issuer: msg.sender,
                metadata: metadata,
                isPositive: isPositive
            })
        );

        emit AttestationAdded(user, attId, attestationType, referenceId, msg.sender, isPositive);
    }

    // ============ V5 CRITICAL VIEW FUNCTIONS ============

    /**
     * @notice Check if user is verified human
     * @dev Called by AgencyRegistry for team linking
     */
    function isVerifiedHuman(address user) external view returns (bool) {
        return users[user].level == LegitimacyLevel.VerifiedHuman;
    }

    function getUserLevel(address user) external view returns (LegitimacyLevel) {
        return users[user].level;
    }

    function getUserProfile(address user)
        external
        view
        returns (LegitimacyLevel level, string memory ensName, bool hasDeposited, uint256 registrationTime)
    {
        UserProfile memory profile = users[user];
        return (profile.level, profile.ensName, profile.hasDeposited, profile.registrationTime);
    }

    function getAttestations(address user) external view returns (Attestation[] memory) {
        return attestations[user];
    }

    function getAttestationCount(address user) external view returns (uint256) {
        return attestations[user].length;
    }

    function getPositiveAttestationCount(address user) external view returns (uint256) {
        uint256 count = 0;
        Attestation[] memory userAttestations = attestations[user];
        for (uint256 i = 0; i < userAttestations.length; i++) {
            if (userAttestations[i].isPositive) {
                count++;
            }
        }
        return count;
    }

    // ============ Admin Functions ============

    function setAuthorizedCaller(address caller, bool status) external onlyOwner {
        authorizedCallers[caller] = status;
        emit AuthorizedCallerUpdated(caller, status);
    }

    function updateZkVerifier(address _newVerifier) external onlyOwner {
        zkVerifier = IZKVerifier(_newVerifier);
    }

    function updateGasSponsor(address _newGasSponsor) external onlyOwner {
        gasSponsorAddress = _newGasSponsor;
    }
}
