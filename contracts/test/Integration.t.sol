// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/UserRegistry.sol";
import "../src/AgencyRegistry.sol";
import "../src/AIOracle.sol";
import "../src/SkillTrial.sol";
import "../src/ProjectEscrow.sol";
import "../src/EnterpriseAccess.sol";
import "../src/DisputeJury.sol";
import "./UserRegistry.t.sol";

/**
 * @title Integration Test
 * @notice End-to-end workflow tests for HumanWork Protocol V5
 */
contract IntegrationTest is Test {
    UserRegistry public userRegistry;
    AgencyRegistry public agencyRegistry;
    AIOracle public aiOracle;
    SkillTrial public skillTrial;
    ProjectEscrow public projectEscrow;
    EnterpriseAccess public enterpriseAccess;
    DisputeJury public disputeJury;

    MockUSDC public usdc;
    MockZKVerifier public zkVerifier;

    address public gasSponsor = address(0x888);
    address public backendServer = address(0x999);

    address public agency = address(0x1);
    address public freelancer = address(0x2);
    address public client = address(0x3);

    function setUp() public {
        zkVerifier = new MockZKVerifier();
        usdc = new MockUSDC();

        // Deploy all contracts
        userRegistry = new UserRegistry(address(zkVerifier), address(usdc), gasSponsor);
        agencyRegistry = new AgencyRegistry(address(usdc), address(userRegistry));

        aiOracle = new AIOracle(address(agencyRegistry), address(0));
        skillTrial = new SkillTrial(address(usdc), address(userRegistry), address(aiOracle));

        aiOracle.setSkillTrial(address(skillTrial));
        aiOracle.transferOwnership(backendServer);

        enterpriseAccess = new EnterpriseAccess(address(usdc), address(agencyRegistry));
        disputeJury = new DisputeJury(address(usdc), address(userRegistry));
        projectEscrow =
            new ProjectEscrow(address(usdc), address(userRegistry), address(agencyRegistry), address(enterpriseAccess));

        // Set permissions
        agencyRegistry.setAiOracle(address(aiOracle));
        userRegistry.setAuthorizedCaller(address(projectEscrow), true);
        userRegistry.setAuthorizedCaller(address(skillTrial), true);
        projectEscrow.setDisputeJuryAddress(address(disputeJury));
        disputeJury.setProjectEscrowAddress(address(projectEscrow));

        // Fund accounts
        usdc.mint(agency, 10000 * 10 ** 6);
        usdc.mint(freelancer, 1000 * 10 ** 6);
        usdc.mint(client, 20000 * 10 ** 6);
    }

    function testCompleteB2BWorkflow() public {
        // 1. Agency registers
        vm.prank(agency);
        usdc.approve(address(agencyRegistry), 500 * 10 ** 6);

        bytes32 gstHash = keccak256(abi.encodePacked("GST123"));

        vm.prank(agency);
        uint256 agencyId = agencyRegistry.registerAgency("TechCorp", gstHash);

        // 2. Freelancer becomes verified human
        vm.prank(freelancer);
        userRegistry.registerBasic();

        bytes memory zkProof = abi.encodePacked("freelancer_proof");
        uint256[] memory signals = new uint256[](1);
        signals[0] = 1;

        vm.prank(freelancer);
        userRegistry.verifyHuman(zkProof, signals);

        // 3. Agency adds freelancer to team
        vm.prank(agency);
        agencyRegistry.addTeamMember(freelancer);

        assertTrue(agencyRegistry.isTeamMember(agencyId, freelancer));

        // 4. Client subscribes to enterprise
        vm.prank(client);
        usdc.approve(address(enterpriseAccess), 5000 * 10 ** 6);

        vm.prank(client);
        enterpriseAccess.subscribe(EnterpriseAccess.Tier.ClientAnnual, "ClientCo");

        assertTrue(enterpriseAccess.isEnterpriseUser(client));

        // 5. Client creates project
        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 2000 * 10 ** 6;
        amounts[1] = 3000 * 10 ** 6;
        amounts[2] = 4000 * 10 ** 6;

        string[] memory descriptions = new string[](3);
        descriptions[0] = "Design phase";
        descriptions[1] = "Development phase";
        descriptions[2] = "Testing phase";

        vm.prank(client);
        usdc.approve(address(projectEscrow), 9000 * 10 ** 6);

        vm.prank(client);
        uint256 projectId = projectEscrow.createProject(freelancer, amounts, descriptions);

        // 6. Freelancer completes and gets approved for milestone 1
        vm.prank(freelancer);
        projectEscrow.completeMilestone(projectId, 0);

        uint256 freelancerBalanceBefore = usdc.balanceOf(freelancer);

        vm.prank(client);
        projectEscrow.approveMilestone(projectId, 0);

        uint256 freelancerBalanceAfter = usdc.balanceOf(freelancer);
        assertEq(freelancerBalanceAfter - freelancerBalanceBefore, 2000 * 10 ** 6);
    }

    function testSkillTrialToProjectWorkflow() public {
        // 1. Register freelancer
        vm.prank(freelancer);
        userRegistry.registerBasic();

        // 2. Backend creates a skill test
        skillTrial.transferOwnership(backendServer);
        vm.prank(backendServer);
        skillTrial.createTest(
            "Solidity Developer", "Advanced Solidity skills test", "ipfs://test-questions", 10 * 10 ** 6
        );

        // 3. Freelancer takes the test
        vm.prank(freelancer);
        usdc.approve(address(skillTrial), 10 * 10 ** 6);

        vm.prank(freelancer);
        uint256 submissionId = skillTrial.submitTrial(0, "ipfs://my-submission");

        // 4. AI grades the submission (via backend)
        vm.prank(backendServer);
        aiOracle.fulfillSkillGrade(
            submissionId, submissionId, freelancer, 92, "Excellent understanding of Solidity patterns"
        );

        // 5. Check freelancer got the badge
        assertEq(skillTrial.balanceOf(freelancer), 1);
        assertEq(userRegistry.getPositiveAttestationCount(freelancer), 1);

        // 6. Freelancer verifies as human
        bytes memory zkProof = abi.encodePacked("proof");
        uint256[] memory signals = new uint256[](1);
        signals[0] = 1;
        vm.prank(freelancer);
        userRegistry.verifyHuman(zkProof, signals);

        // 7. Client subscribes and creates project
        vm.prank(client);
        usdc.approve(address(enterpriseAccess), 5000 * 10 ** 6);
        vm.prank(client);
        enterpriseAccess.subscribe(EnterpriseAccess.Tier.ClientAnnual, "ClientCo");

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 5000 * 10 ** 6;
        string[] memory descriptions = new string[](1);
        descriptions[0] = "Build smart contract";

        vm.prank(client);
        usdc.approve(address(projectEscrow), 5000 * 10 ** 6);
        vm.prank(client);
        uint256 projectId = projectEscrow.createProject(freelancer, amounts, descriptions);

        // 8. Complete the project
        vm.prank(freelancer);
        projectEscrow.completeMilestone(projectId, 0);

        vm.prank(client);
        projectEscrow.approveMilestone(projectId, 0);

        // 9. Check attestations increased
        assertEq(userRegistry.getPositiveAttestationCount(freelancer), 2);
    }
}
