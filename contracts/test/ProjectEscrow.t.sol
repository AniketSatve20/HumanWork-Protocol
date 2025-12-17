// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ProjectEscrow.sol";
import "../src/UserRegistry.sol";
import "../src/AgencyRegistry.sol";
import "../src/EnterpriseAccess.sol";

import "./UserRegistry.t.sol";

contract ProjectEscrowTest is Test {
    ProjectEscrow public escrow;
    UserRegistry public userRegistry;
    AgencyRegistry public agencyRegistry;
    EnterpriseAccess public enterpriseAccess;
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

        escrow =
            new ProjectEscrow(address(usdc), address(userRegistry), address(agencyRegistry), address(enterpriseAccess));

        userRegistry.setAuthorizedCaller(address(escrow), true);

        usdc.mint(client, 10000 * 10 ** 6);

        // Client must be an enterprise user
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
        uint256 projectId = escrow.createProject(freelancer, amounts, descriptions);

        ProjectEscrow.Project memory proj = escrow.getProject(projectId);

        assertEq(proj.client, client);
        assertEq(proj.freelancer, freelancer);
        assertEq(proj.totalAmount, 4500 * 10 ** 6);
        assertTrue(proj.isEnterpriseProject);
    }

    function testCompleteMilestone() public {
        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 1000 * 10 ** 6;
        amounts[1] = 1500 * 10 ** 6;
        amounts[2] = 2000 * 10 ** 6;
        string[] memory descriptions = new string[](3);
        descriptions[0] = "M1";
        descriptions[1] = "M2";
        descriptions[2] = "M3";

        vm.prank(client);
        usdc.approve(address(escrow), 4500 * 10 ** 6);
        vm.prank(client);
        uint256 projectId = escrow.createProject(freelancer, amounts, descriptions);

        vm.prank(freelancer);
        escrow.completeMilestone(projectId, 0);

        ProjectEscrow.Milestone memory m = escrow.getMilestone(projectId, 0);
        assertEq(uint256(m.status), uint256(ProjectEscrow.MilestoneStatus.Completed));
    }

    function testAddMilestone_HandleScopeCreep() public {
        // 1. Create project with one milestone
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10 ** 6;
        string[] memory descriptions = new string[](1);
        descriptions[0] = "M1: Original Scope";

        vm.prank(client);
        usdc.approve(address(escrow), 1000 * 10 ** 6);
        vm.prank(client);
        uint256 projectId = escrow.createProject(freelancer, amounts, descriptions);

        ProjectEscrow.Project memory proj_v1 = escrow.getProject(projectId);
        assertEq(proj_v1.totalAmount, 1000 * 10 ** 6);
        assertEq(proj_v1.milestones.length, 1);

        // 2. Client adds a new milestone for "scope creep"
        vm.prank(client);
        usdc.approve(address(escrow), 500 * 10 ** 6);

        vm.prank(client);
        escrow.addMilestone(projectId, 500 * 10 ** 6, "M2: Dark Mode Feature");

        // 3. Check that the project was updated
        ProjectEscrow.Project memory proj_v2 = escrow.getProject(projectId);
        assertEq(proj_v2.totalAmount, 1500 * 10 ** 6);
        assertEq(proj_v2.milestones.length, 2);

        ProjectEscrow.Milestone memory m = escrow.getMilestone(projectId, 1);
        assertEq(m.amount, 500 * 10 ** 6);
        assertEq(m.description, "M2: Dark Mode Feature");
    }

    function testApproveMilestone() public {
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1000 * 10 ** 6;
        string[] memory descriptions = new string[](1);
        descriptions[0] = "Milestone 1";

        vm.prank(client);
        usdc.approve(address(escrow), 1000 * 10 ** 6);
        vm.prank(client);
        uint256 projectId = escrow.createProject(freelancer, amounts, descriptions);

        // Freelancer completes
        vm.prank(freelancer);
        escrow.completeMilestone(projectId, 0);

        uint256 balanceBefore = usdc.balanceOf(freelancer);

        // Client approves
        vm.prank(client);
        escrow.approveMilestone(projectId, 0);

        uint256 balanceAfter = usdc.balanceOf(freelancer);
        assertEq(balanceAfter - balanceBefore, 1000 * 10 ** 6);
    }
}
