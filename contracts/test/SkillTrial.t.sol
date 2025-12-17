// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SkillTrial.sol";
import "../src/UserRegistry.sol";
import "../src/AIOracle.sol";
import "../src/AgencyRegistry.sol";

import "./UserRegistry.t.sol";

contract SkillTrialTest is Test {
    SkillTrial public skillTrial;
    UserRegistry public userRegistry;
    AIOracle public aiOracle;
    AgencyRegistry public agencyRegistry;
    MockUSDC public usdc;
    MockZKVerifier public zkVerifier;

    address public gasSponsor = address(0x888);
    address public backendServer = address(0x999);
    address public freelancer = address(0x2);

    function setUp() public {
        usdc = new MockUSDC();
        zkVerifier = new MockZKVerifier();

        // Deploy all V2 dependencies
        userRegistry = new UserRegistry(address(zkVerifier), address(usdc), gasSponsor);
        agencyRegistry = new AgencyRegistry(address(usdc), address(userRegistry));

        // Deploy AIOracle, but SkillTrial address is 0 for now
        aiOracle = new AIOracle(address(agencyRegistry), address(0));

        // Deploy SkillTrial, passing in the AIOracle address
        skillTrial = new SkillTrial(address(usdc), address(userRegistry), address(aiOracle));

        // Set permissions
        aiOracle.setSkillTrial(address(skillTrial));
        skillTrial.transferOwnership(backendServer);
        aiOracle.transferOwnership(backendServer);

        // Authorize SkillTrial to add attestations
        userRegistry.setAuthorizedCaller(address(skillTrial), true);

        // Fund freelancer
        usdc.mint(freelancer, 1000 * 10 ** 6);

        // Freelancer must be registered to take a test
        vm.prank(freelancer);
        userRegistry.registerBasic();
    }

    function testCreateTest() public {
        vm.prank(backendServer);
        skillTrial.createTest(
            "Solidity v0.8.20 Test", "A test for advanced Solidity features", "ipfs://CID_FOR_TEST_DATA", 10 * 10 ** 6
        );

        SkillTrial.SkillTest memory test = skillTrial.getTest(0);
        assertEq(test.title, "Solidity v0.8.20 Test");
        assertEq(test.fee, 10 * 10 ** 6);
    }

    function testSubmitTrial() public {
        // 1. Backend creates the test
        vm.prank(backendServer);
        skillTrial.createTest("Solidity Test", "Test", "ipfs://...", 10 * 10 ** 6);

        // 2. Freelancer approves USDC fee and submits
        vm.prank(freelancer);
        usdc.approve(address(skillTrial), 10 * 10 ** 6);

        vm.prank(freelancer);
        uint256 submissionId = skillTrial.submitTrial(0, "ipfs://CID_FOR_SUBMISSION");

        // 3. Check that the submission is recorded
        SkillTrial.Submission memory sub = skillTrial.getSubmission(submissionId);
        assertEq(sub.testId, 0);
        assertEq(sub.applicant, freelancer);
        assertEq(uint256(sub.status), uint256(SkillTrial.SubmissionStatus.Pending));
    }

    function testFulfillSkillGrade() public {
        // 1. Backend creates the test
        vm.prank(backendServer);
        skillTrial.createTest("Solidity Test", "Test", "ipfs://...", 10 * 10 ** 6);

        // 2. Freelancer submits
        vm.prank(freelancer);
        usdc.approve(address(skillTrial), 10 * 10 ** 6);
        vm.prank(freelancer);
        uint256 submissionId = skillTrial.submitTrial(0, "ipfs://CID_FOR_SUBMISSION");

        // 3. Backend (as owner of AIOracle) fulfills the grade
        vm.prank(backendServer);
        aiOracle.fulfillSkillGrade(
            submissionId,
            submissionId,
            freelancer,
            95, // Score
            "Excellent work, passed all security checks."
        );

        // 4. Check that the badge was minted
        assertEq(skillTrial.ownerOf(0), freelancer);

        // 5. Check that an attestation was added to the user's profile
        assertEq(userRegistry.getAttestationCount(freelancer), 1);
        assertEq(userRegistry.getPositiveAttestationCount(freelancer), 1);

        // 6. Check submission status
        SkillTrial.Submission memory sub = skillTrial.getSubmission(submissionId);
        assertEq(uint256(sub.status), uint256(SkillTrial.SubmissionStatus.Graded));
        assertEq(sub.score, 95);
    }

    function testCannotMintWithFailingGrade() public {
        vm.prank(backendServer);
        skillTrial.createTest("Hard Test", "Test", "ipfs://...", 10 * 10 ** 6);

        vm.prank(freelancer);
        usdc.approve(address(skillTrial), 10 * 10 ** 6);
        vm.prank(freelancer);
        uint256 submissionId = skillTrial.submitTrial(0, "ipfs://SUBMISSION");

        // Grade below 80 (failing)
        vm.prank(backendServer);
        aiOracle.fulfillSkillGrade(
            submissionId,
            submissionId,
            freelancer,
            65, // Failing score
            "Needs improvement."
        );

        // No badge minted - check balance is 0
        assertEq(skillTrial.balanceOf(freelancer), 0);

        // No attestation added
        assertEq(userRegistry.getAttestationCount(freelancer), 0);
    }
}
