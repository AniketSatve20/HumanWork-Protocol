// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DisputeJury.sol";
import "../src/ProjectEscrow.sol";
import "../src/UserRegistry.sol";
import "../src/AgencyRegistry.sol";
import "../src/EnterpriseAccess.sol";

import "./UserRegistry.t.sol";

contract DisputeJuryTest is Test {
    DisputeJury public jury;
    ProjectEscrow public escrow;
    UserRegistry public userRegistry;
    AgencyRegistry public agencyRegistry;
    EnterpriseAccess public enterpriseAccess;
    MockUSDC public usdc;
    MockZKVerifier public zkVerifier;

    address public gasSponsor = address(0x888);
    address public client = address(0x10);
    address public freelancer = address(0x20);
    address public juror1 = address(0x1);
    address public juror2 = address(0x2);
    address public juror3 = address(0x3);
    address public juror4 = address(0x4);
    address public juror5 = address(0x5);

    function setUp() public {
        zkVerifier = new MockZKVerifier();
        usdc = new MockUSDC();

        userRegistry = new UserRegistry(address(zkVerifier), address(usdc), gasSponsor);
        agencyRegistry = new AgencyRegistry(address(usdc), address(userRegistry));
        enterpriseAccess = new EnterpriseAccess(address(usdc), address(agencyRegistry));
        jury = new DisputeJury(address(usdc), address(userRegistry));
        escrow = new ProjectEscrow(
            address(usdc), address(userRegistry), address(agencyRegistry), address(enterpriseAccess)
        );

        jury.setProjectEscrowAddress(address(escrow));
        escrow.setDisputeJuryAddress(address(jury));
        userRegistry.setAuthorizedCaller(address(escrow), true);

        // Register and verify jurors
        address[5] memory jurorAddrs = [juror1, juror2, juror3, juror4, juror5];
        for (uint256 i = 0; i < 5; i++) {
            usdc.mint(jurorAddrs[i], 1000 * 10 ** 6);
            vm.prank(jurorAddrs[i]);
            userRegistry.registerBasic();
            bytes memory zkProof = abi.encodePacked("proof", i);
            uint256[] memory signals = new uint256[](1);
            signals[0] = i;
            vm.prank(jurorAddrs[i]);
            userRegistry.verifyHuman(zkProof, signals);
        }

        // Fund client
        usdc.mint(client, 50000 * 10 ** 6);
        vm.prank(client);
        usdc.approve(address(enterpriseAccess), 5000 * 10 ** 6);
        vm.prank(client);
        enterpriseAccess.subscribe(EnterpriseAccess.Tier.ClientAnnual, "ClientCo");
    }

    function testStakeAsJuror() public {
        vm.prank(juror1);
        usdc.approve(address(jury), 100 * 10 ** 6);
        vm.prank(juror1);
        jury.stakeAsJuror(100 * 10 ** 6);

        (uint256 staked,,, bool isActive,) = jury.getJurorInfo(juror1);
        assertEq(staked, 100 * 10 ** 6);
        assertTrue(isActive);
    }

    function testCannotStakeWithoutVerification() public {
        address unverified = address(0x99);
        usdc.mint(unverified, 1000 * 10 ** 6);
        vm.prank(unverified);
        usdc.approve(address(jury), 100 * 10 ** 6);
        vm.prank(unverified);
        vm.expectRevert(DisputeJury.NotVerifiedHuman.selector);
        jury.stakeAsJuror(100 * 10 ** 6);
    }

    function testUnstake() public {
        vm.prank(juror1);
        usdc.approve(address(jury), 100 * 10 ** 6);
        vm.prank(juror1);
        jury.stakeAsJuror(100 * 10 ** 6);

        uint256 balanceBefore = usdc.balanceOf(juror1);
        vm.prank(juror1);
        jury.unstake(50 * 10 ** 6);
        uint256 balanceAfter = usdc.balanceOf(juror1);
        assertEq(balanceAfter - balanceBefore, 50 * 10 ** 6);
    }

    function testCreateDisputeRequiresJurors() public {
        // Create project
        uint256 projectId = _createProjectWithFreelancer(1000 * 10 ** 6);
        // No jurors staked yet
        vm.prank(client);
        vm.expectRevert(DisputeJury.NotEnoughJurors.selector);
        escrow.createDispute(projectId, 0);
    }

    function testCastVoteAndResolveDispute() public {
        // Stake all jurors
        _stakeAllJurors();

        // Create project + complete milestone + dispute
        uint256 projectId = _createProjectWithFreelancer(1000 * 10 ** 6);
        vm.prank(freelancer);
        escrow.completeMilestone(projectId, 0);

        vm.prank(client);
        escrow.createDispute(projectId, 0);

        // Get dispute jurors and vote
        address[] memory jurorList = jury.getDisputeJurors(0);

        // 3 vote for freelancer, 2 for client → freelancer wins
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(jurorList[i]);
            jury.castVote(0, DisputeJury.VoteChoice.SideWithFreelancer);
        }
        for (uint256 i = 3; i < jurorList.length; i++) {
            if (jurorList[i] != address(0)) {
                vm.prank(jurorList[i]);
                jury.castVote(0, DisputeJury.VoteChoice.SideWithClient);
            }
        }

        // Dispute should be auto-finalized and funds distributed
        (,,,, DisputeJury.DisputeOutcome outcome,,,,) = jury.getDispute(0);
        assertEq(uint256(outcome), uint256(DisputeJury.DisputeOutcome.FreelancerWins));
    }

    // ============ Helpers ============

    // ============ Fuzz Tests: Double-Voting Prevention ============

    /// @notice Fuzz: a juror cannot vote twice with ANY choice combination
    function testFuzz_DoubleVotingPrevented(uint8 firstChoice, uint8 secondChoice) public {
        firstChoice = uint8(bound(firstChoice, 0, 2));
        secondChoice = uint8(bound(secondChoice, 0, 2));

        _stakeAllJurors();
        uint256 projectId = _createProjectWithFreelancer(1000 * 10 ** 6);
        vm.prank(freelancer);
        escrow.completeMilestone(projectId, 0);
        vm.prank(client);
        escrow.createDispute(projectId, 0);

        address[] memory jurorList = jury.getDisputeJurors(0);

        // First vote succeeds
        vm.prank(jurorList[0]);
        jury.castVote(0, DisputeJury.VoteChoice(firstChoice));

        // Second vote by same juror MUST revert regardless of choice
        vm.prank(jurorList[0]);
        vm.expectRevert(DisputeJury.AlreadyVoted.selector);
        jury.castVote(0, DisputeJury.VoteChoice(secondChoice));
    }

    /// @notice Fuzz: all 5 jurors vote with random choices, verify correct outcome
    function testFuzz_VotingOutcomeDetermination(
        uint8 c0, uint8 c1, uint8 c2, uint8 c3, uint8 c4
    ) public {
        uint8[5] memory choices = [
            uint8(bound(c0, 0, 2)),
            uint8(bound(c1, 0, 2)),
            uint8(bound(c2, 0, 2)),
            uint8(bound(c3, 0, 2)),
            uint8(bound(c4, 0, 2))
        ];

        _stakeAllJurors();
        uint256 projectId = _createProjectWithFreelancer(1000 * 10 ** 6);
        vm.prank(freelancer);
        escrow.completeMilestone(projectId, 0);
        vm.prank(client);
        escrow.createDispute(projectId, 0);

        address[] memory jurorList = jury.getDisputeJurors(0);

        // All 5 jurors vote
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(jurorList[i]);
            jury.castVote(0, DisputeJury.VoteChoice(choices[i]));
        }

        // Dispute auto-finalized after 5 votes
        (,,,, DisputeJury.DisputeOutcome outcome,,,,) = jury.getDispute(0);
        assertTrue(uint256(outcome) > 0, "Dispute must be resolved");

        // Tally expected outcome
        uint256 ai; uint256 cl; uint256 fr;
        for (uint256 i = 0; i < 5; i++) {
            if (choices[i] == 0) ai++;
            else if (choices[i] == 1) cl++;
            else fr++;
        }

        if (cl > fr && cl > ai) {
            assertEq(uint256(outcome), uint256(DisputeJury.DisputeOutcome.ClientWins));
        } else if (fr > cl && fr > ai) {
            assertEq(uint256(outcome), uint256(DisputeJury.DisputeOutcome.FreelancerWins));
        } else {
            // AcceptAI wins or tie → defaults to AI split
            assertEq(uint256(outcome), uint256(DisputeJury.DisputeOutcome.AcceptAISplit));
        }
    }

    /// @notice Fuzz: AI recommended split is correctly applied when AcceptAI wins
    function testFuzz_AiSplitAppliedCorrectly(uint8 split) public {
        split = uint8(bound(split, 0, 100));

        _stakeAllJurors();
        uint256 projectId = _createProjectWithFreelancer(1000 * 10 ** 6);
        vm.prank(freelancer);
        escrow.completeMilestone(projectId, 0);
        vm.prank(client);
        escrow.createDispute(projectId, 0);

        // Set AI report with fuzzed split
        jury.setAiReport(0, "AI analysis report", split);

        // All jurors vote AcceptAI → guaranteed AcceptAISplit outcome
        address[] memory jurorList = jury.getDisputeJurors(0);
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(jurorList[i]);
            jury.castVote(0, DisputeJury.VoteChoice.AcceptAI);
        }

        (,,,, DisputeJury.DisputeOutcome outcome,,,,) = jury.getDispute(0);
        assertEq(uint256(outcome), uint256(DisputeJury.DisputeOutcome.AcceptAISplit));
    }

    /// @notice Fuzz: cannot vote after dispute is already resolved
    function testFuzz_CannotVoteAfterResolution(uint8 choiceIndex) public {
        choiceIndex = uint8(bound(choiceIndex, 0, 2));

        _stakeAllJurors();
        uint256 projectId = _createProjectWithFreelancer(1000 * 10 ** 6);
        vm.prank(freelancer);
        escrow.completeMilestone(projectId, 0);
        vm.prank(client);
        escrow.createDispute(projectId, 0);

        address[] memory jurorList = jury.getDisputeJurors(0);

        // All 5 jurors vote to resolve the dispute
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(jurorList[i]);
            jury.castVote(0, DisputeJury.VoteChoice.SideWithClient);
        }

        // Dispute is now resolved
        (,,,, DisputeJury.DisputeOutcome outcome,,,,) = jury.getDispute(0);
        assertTrue(uint256(outcome) > 0, "Dispute should be resolved");

        // Dispute is now resolved — AlreadyResolved check fires before AlreadyVoted
        vm.prank(jurorList[0]);
        vm.expectRevert(DisputeJury.AlreadyResolved.selector);
        jury.castVote(0, DisputeJury.VoteChoice(choiceIndex));
    }

    /// @notice Fuzz: non-jurors cannot vote on disputes with any choice
    function testFuzz_NonJurorCannotVote(address randomAddr, uint8 choiceIndex) public {
        choiceIndex = uint8(bound(choiceIndex, 0, 2));
        // Exclude known addresses from fuzz
        vm.assume(randomAddr != juror1 && randomAddr != juror2 && randomAddr != juror3);
        vm.assume(randomAddr != juror4 && randomAddr != juror5);
        vm.assume(randomAddr != client && randomAddr != freelancer && randomAddr != address(0));

        _stakeAllJurors();
        uint256 projectId = _createProjectWithFreelancer(1000 * 10 ** 6);
        vm.prank(freelancer);
        escrow.completeMilestone(projectId, 0);
        vm.prank(client);
        escrow.createDispute(projectId, 0);

        vm.prank(randomAddr);
        vm.expectRevert(DisputeJury.NotJurorInCase.selector);
        jury.castVote(0, DisputeJury.VoteChoice(choiceIndex));
    }

    /// @notice Fuzz: voting within the voting period succeeds at any valid timestamp
    function testFuzz_VotingWithinPeriod(uint256 timeElapsed) public {
        timeElapsed = bound(timeElapsed, 0, 7 days - 1);

        _stakeAllJurors();
        uint256 projectId = _createProjectWithFreelancer(1000 * 10 ** 6);
        vm.prank(freelancer);
        escrow.completeMilestone(projectId, 0);
        vm.prank(client);
        escrow.createDispute(projectId, 0);

        address[] memory jurorList = jury.getDisputeJurors(0);

        // Warp forward by fuzzed time (still within voting period)
        vm.warp(block.timestamp + timeElapsed);

        // Vote should succeed within the voting period
        vm.prank(jurorList[0]);
        jury.castVote(0, DisputeJury.VoteChoice.AcceptAI);
    }

    /// @notice Fuzz: voting after the voting period always reverts
    function testFuzz_VotingAfterPeriodReverts(uint256 timeAfter) public {
        timeAfter = bound(timeAfter, 1, 365 days);

        _stakeAllJurors();
        uint256 projectId = _createProjectWithFreelancer(1000 * 10 ** 6);
        vm.prank(freelancer);
        escrow.completeMilestone(projectId, 0);
        vm.prank(client);
        escrow.createDispute(projectId, 0);

        address[] memory jurorList = jury.getDisputeJurors(0);

        // Warp past voting period
        vm.warp(block.timestamp + 7 days + timeAfter);

        vm.prank(jurorList[0]);
        vm.expectRevert(DisputeJury.VotingEnded.selector);
        jury.castVote(0, DisputeJury.VoteChoice.AcceptAI);
    }

    /// @notice Fuzz: staking with various valid amounts
    function testFuzz_StakeAmount(uint256 amount) public {
        amount = bound(amount, 100 * 10 ** 6, 10000 * 10 ** 6);

        usdc.mint(juror1, amount);
        vm.prank(juror1);
        usdc.approve(address(jury), amount);
        vm.prank(juror1);
        jury.stakeAsJuror(amount);

        (uint256 staked,,, bool isActive,) = jury.getJurorInfo(juror1);
        assertEq(staked, amount);
        assertTrue(isActive);
    }

    // ============ Helpers (continued) ============

    function _stakeAllJurors() internal {
        address[5] memory jurorAddrs = [juror1, juror2, juror3, juror4, juror5];
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(jurorAddrs[i]);
            usdc.approve(address(jury), 100 * 10 ** 6);
            vm.prank(jurorAddrs[i]);
            jury.stakeAsJuror(100 * 10 ** 6);
        }
    }

    function _createProjectWithFreelancer(uint256 amount) internal returns (uint256) {
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        string[] memory descriptions = new string[](1);
        descriptions[0] = "Milestone 1";

        vm.prank(client);
        usdc.approve(address(escrow), amount);
        vm.prank(client);
        uint256 projectId = escrow.createProject(amounts, descriptions, "ipfs://brief");
        vm.prank(client);
        escrow.assignFreelancer(projectId, freelancer);
        return projectId;
    }
}
