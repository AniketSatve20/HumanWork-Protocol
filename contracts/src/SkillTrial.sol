// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "./UserRegistry.sol";
import "./AIOracle.sol";

/**
 * @title SkillTrial V5
 * @notice AI-powered skill verification system
 * @dev Mints NFT badges for successfully passed tests.
 */
contract SkillTrial is ERC721, Ownable, ReentrancyGuard {
    // ============ State Variables ============

    IERC20 public immutable stablecoin;
    UserRegistry public immutable userRegistry;
    AIOracle public aiOracle;

    struct SkillTest {
        string title;
        string description;
        string ipfsHash;
        uint256 fee;
        bool isActive;
        uint256 submissionCount;
    }

    enum SubmissionStatus {
        Pending,
        Graded
    }

    struct Submission {
        uint256 testId;
        address applicant;
        string submissionHash;
        SubmissionStatus status;
        uint256 submittedAt;
        uint8 score;
        string report;
    }

    // ============ Storage ============

    SkillTest[] public skillTests;
    Submission[] public submissions;
    mapping(address => uint256[]) public freelancerBadges;
    mapping(uint256 => uint256) public badgeToSubmissionId;

    uint256 public badgeCounter; // We use this to track token IDs

    // ============ Events ============

    event TestCreated(uint256 indexed testId, string title, uint256 fee);
    event TrialSubmitted(uint256 indexed submissionId, uint256 indexed testId, address indexed applicant);
    event TrialGraded(uint256 indexed submissionId, uint8 score, uint256 indexed badgeId);

    // ============ Errors ============

    error OnlyOracle();
    error OnlyBackend();
    error TestNotActive();
    error InsufficientFee();
    error AlreadySubmitted();

    // ============ Modifiers ============

    modifier onlyAIOracle() {
        if (msg.sender != address(aiOracle)) revert OnlyOracle();
        _;
    }

    // ============ Constructor ============

    constructor(address _stablecoin, address _userRegistry, address _aiOracle)
        ERC721("HumanWork Skill Badge", "HWSKILL")
        Ownable(msg.sender)
    {
        stablecoin = IERC20(_stablecoin);
        userRegistry = UserRegistry(_userRegistry);
        aiOracle = AIOracle(_aiOracle);
    }

    // ============ Admin Functions ============

    function createTest(string memory title, string memory description, string memory ipfsHash, uint256 fee)
        external
        onlyOwner
    {
        skillTests.push(
            SkillTest({
                title: title, description: description, ipfsHash: ipfsHash, fee: fee, isActive: true, submissionCount: 0
            })
        );
        emit TestCreated(skillTests.length - 1, title, fee);
    }

    // ============ Freelancer Functions ============

    function submitTrial(uint256 testId, string memory submissionHash) external nonReentrant returns (uint256) {
        SkillTest storage test = skillTests[testId];
        if (!test.isActive) revert TestNotActive();

        if (test.fee > 0) {
            require(stablecoin.transferFrom(msg.sender, address(this), test.fee), "Fee transfer failed");
        }

        uint256 submissionId = submissions.length;
        submissions.push(
            Submission({
                testId: testId,
                applicant: msg.sender,
                submissionHash: submissionHash,
                status: SubmissionStatus.Pending,
                submittedAt: block.timestamp,
                score: 0,
                report: ""
            })
        );

        test.submissionCount++;

        // Request grading from the AI Oracle
        aiOracle.requestSkillGrade(submissionId, msg.sender, submissionHash);

        emit TrialSubmitted(submissionId, testId, msg.sender);
        return submissionId;
    }

    // ============ Oracle-Only Functions ============

    /**
     * @notice Mints the skill badge NFT after AI grading
     * @dev Only callable by the AIOracle contract
     */
    function mint(address user, uint256 submissionId, uint8 score, string memory report)
        external
        onlyAIOracle
        nonReentrant
    {
        Submission storage sub = submissions[submissionId];

        // Ensure this submission is pending
        require(sub.status == SubmissionStatus.Pending, "Submission not pending");

        sub.status = SubmissionStatus.Graded;
        sub.score = score;
        sub.report = report;

        if (score >= 80) {
            // Passing score
            uint256 badgeId = badgeCounter++;

            _safeMint(user, badgeId);

            freelancerBadges[user].push(badgeId);
            badgeToSubmissionId[badgeId] = submissionId;

            // Add positive attestation to UserRegistry
            userRegistry.addAttestation(user, UserRegistry.AttestationType.SKILL, badgeId);

            emit TrialGraded(submissionId, score, badgeId);
        } else {
            // Add negative attestation? Or just no badge.
            // For now, just graded, no badge.
            emit TrialGraded(submissionId, score, type(uint256).max); // No badge minted
        }
    }

    // ============ View Functions ============

    function getTest(uint256 testId) external view returns (SkillTest memory) {
        return skillTests[testId];
    }

    function getSubmission(uint256 submissionId) external view returns (Submission memory) {
        return submissions[submissionId];
    }

    function getFreelancerBadges(address user) external view returns (uint256[] memory) {
        return freelancerBadges[user];
    }

    function getTestCount() external view returns (uint256) {
        return skillTests.length;
    }

    function getSubmissionCount() external view returns (uint256) {
        return submissions.length;
    }

    // ============ Admin Functions ============

    function setAiOracle(address _aiOracle) external onlyOwner {
        aiOracle = AIOracle(_aiOracle);
    }

    function deactivateTest(uint256 testId) external onlyOwner {
        skillTests[testId].isActive = false;
    }

    function withdrawFees(address to) external onlyOwner {
        uint256 balance = stablecoin.balanceOf(address(this));
        require(stablecoin.transfer(to, balance), "Withdrawal failed");
    }
}
