// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ProjectEscrow.sol";
import "../src/UserRegistry.sol";
import "../src/AgencyRegistry.sol";
import "../src/EnterpriseAccess.sol";
import "../src/DisputeJury.sol";

import "./UserRegistry.t.sol";

contract ProjectEscrowTest is Test {
    ProjectEscrow public escrow;
    UserRegistry public userRegistry;
    AgencyRegistry public agencyRegistry;
    EnterpriseAccess public enterpriseAccess;
    DisputeJury public disputeJury;
    MockUSDC public usdc;
    MockZKVerifier public zkVerifier;

    address public client = address(0x1);
    address public freelancer = address(0x2);
    address public gasSponsor = address(0x888);

    function setUp() public {
        usdc = new MockUSDC();
        zkVerifier = new MockZKVerifier();

        userRegistry = new UserRegistry(address(zkVerifier), address(usdc), gasSponsor);
        agencyRegistry = new AgencyRegistry(address(usdc), address(userRegistry));
        enterpriseAccess = new EnterpriseAccess(address(usdc), address(agencyRegistry));
        disputeJury = new DisputeJury(address(usdc), address(userRegistry));

        escrow = new ProjectEscrow(
            address(usdc), address(userRegistry), address(agencyRegistry), address(enterpriseAccess)
        );

        userRegistry.setAuthorizedCaller(address(escrow), true);
        escrow.setDisputeJuryAddress(address(disputeJury));
        disputeJury.setProjectEscrowAddress(address(escrow));

        usdc.mint(client, 50000 * 10 ** 6);

        // Client subscribes to enterprise
        vm.prank(client);
        usdc.approve(address(enterpriseAccess), 5000 * 10 ** 6);
        vm.prank(client);
        enterpriseAccess.subscribe(EnterpriseAccess.Tier.ClientAnnual, "ClientCo");
    }

    function testCreateProject() public {
        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 1000 * 10 ** 6;
        amounts[1] = 1500 * 10 ** 6;
        amounts[2] = 2000 * 10 ** 6;

        string[] memory descriptions = new string[](3);
        descriptions[0] = "Milestone 1";
        descriptions[1] = "Milestone 2";
        descriptions[2] = "Milestone 3";

        vm.prank(client);
        usdc.approve(address(escrow), 4500 * 10 ** 6);

        vm.prank(client);
        uint256 projectId = escrow.createProject(amounts, descriptions, "ipfs://project-brief");

        ProjectEscrow.Project memory proj = escrow.getProject(projectId);

        assertEq(proj.client, client);
        assertEq(proj.freelancer, address(0)); // No freelancer yet!
        assertEq(proj.totalAmount, 4500 * 10 ** 6);
        assertEq(uint256(proj.status), uint256(ProjectEscrow.ProjectStatus.Open));
        assertTrue(proj.isEnterpriseProject);
    }

    function testAssignFreelancer() public {
        uint256 projectId = _createProject(1000 * 10 ** 6);

        vm.prank(client);
        escrow.assignFreelancer(projectId, freelancer);

        ProjectEscrow.Project memory proj = escrow.getProject(projectId);
        assertEq(proj.freelancer, freelancer);
        assertEq(uint256(proj.status), uint256(ProjectEscrow.ProjectStatus.Active));
    }

    function testCannotAssignSelfAsFreelancer() public {
        uint256 projectId = _createProject(1000 * 10 ** 6);

        vm.prank(client);
        vm.expectRevert(ProjectEscrow.ClientCannotBeFreelancer.selector);
        escrow.assignFreelancer(projectId, client);
    }

    function testCompleteMilestone() public {
        uint256 projectId = _createProjectWithFreelancer(1000 * 10 ** 6);

        vm.prank(freelancer);
        escrow.completeMilestone(projectId, 0);

        ProjectEscrow.Milestone memory m = escrow.getMilestone(projectId, 0);
        assertEq(uint256(m.status), uint256(ProjectEscrow.MilestoneStatus.Completed));
    }

    function testApproveMilestoneWithFee() public {
        uint256 projectId = _createProjectWithFreelancer(1000 * 10 ** 6);

        vm.prank(freelancer);
        escrow.completeMilestone(projectId, 0);

        uint256 balanceBefore = usdc.balanceOf(freelancer);

        vm.prank(client);
        escrow.approveMilestone(projectId, 0);

        uint256 balanceAfter = usdc.balanceOf(freelancer);
        // 2.5% fee: 1000 * 0.975 = 975 USDC
        assertEq(balanceAfter - balanceBefore, 975 * 10 ** 6);
        assertEq(escrow.accumulatedFees(), 25 * 10 ** 6);
    }

    function testAddMilestone() public {
        uint256 projectId = _createProjectWithFreelancer(1000 * 10 ** 6);

        vm.prank(client);
        usdc.approve(address(escrow), 500 * 10 ** 6);

        vm.prank(client);
        escrow.addMilestone(projectId, 500 * 10 ** 6, "Scope creep milestone");

        ProjectEscrow.Project memory proj = escrow.getProject(projectId);
        assertEq(proj.totalAmount, 1500 * 10 ** 6);
        assertEq(proj.milestones.length, 2);
    }

    function testClientCancelPaysCompletedWork() public {
        uint256 projectId = _createProjectWithFreelancer(1000 * 10 ** 6);

        // Freelancer completes milestone
        vm.prank(freelancer);
        escrow.completeMilestone(projectId, 0);

        uint256 freelancerBefore = usdc.balanceOf(freelancer);
        uint256 clientBefore = usdc.balanceOf(client);

        // Client cancels - completed work should be paid
        vm.prank(client);
        escrow.clientCancel(projectId);

        uint256 freelancerAfter = usdc.balanceOf(freelancer);
        // Freelancer gets paid (minus 2.5% fee)
        assertGt(freelancerAfter, freelancerBefore);
    }

    function testFreelancerCancelRefundsAll() public {
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1000 * 10 ** 6;
        amounts[1] = 2000 * 10 ** 6;
        string[] memory descriptions = new string[](2);
        descriptions[0] = "M1";
        descriptions[1] = "M2";

        vm.prank(client);
        usdc.approve(address(escrow), 3000 * 10 ** 6);
        vm.prank(client);
        uint256 projectId = escrow.createProject(amounts, descriptions, "ipfs://brief");
        vm.prank(client);
        escrow.assignFreelancer(projectId, freelancer);

        uint256 clientBefore = usdc.balanceOf(client);

        vm.prank(freelancer);
        escrow.freelancerCancel(projectId);

        uint256 clientAfter = usdc.balanceOf(client);
        assertEq(clientAfter - clientBefore, 3000 * 10 ** 6);
    }

    function testWithdrawFees() public {
        uint256 projectId = _createProjectWithFreelancer(1000 * 10 ** 6);
        vm.prank(freelancer);
        escrow.completeMilestone(projectId, 0);
        vm.prank(client);
        escrow.approveMilestone(projectId, 0);

        address treasury = address(0xDEAD);
        uint256 fees = escrow.accumulatedFees();
        assertGt(fees, 0);

        escrow.withdrawFees(treasury);
        assertEq(usdc.balanceOf(treasury), fees);
        assertEq(escrow.accumulatedFees(), 0);
    }

    // ============ Helpers ============

    function _createProject(uint256 amount) internal returns (uint256) {
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        string[] memory descriptions = new string[](1);
        descriptions[0] = "Milestone 1";

        vm.prank(client);
        usdc.approve(address(escrow), amount);
        vm.prank(client);
        return escrow.createProject(amounts, descriptions, "ipfs://brief");
    }

    function _createProjectWithFreelancer(uint256 amount) internal returns (uint256) {
        uint256 projectId = _createProject(amount);
        vm.prank(client);
        escrow.assignFreelancer(projectId, freelancer);
        return projectId;
    }
}
