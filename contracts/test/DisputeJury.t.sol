// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DisputeJury.sol";
import "../src/UserRegistry.sol";

import "./UserRegistry.t.sol";

contract DisputeJuryTest is Test {
    DisputeJury public jury;
    UserRegistry public userRegistry;
    MockUSDC public usdc;
    MockZKVerifier public zkVerifier;
    
    address public gasSponsor = address(0x888);
    address public juror1 = address(0x1);
    address public juror2 = address(0x2);
    address public juror3 = address(0x3);
    address public juror4 = address(0x4);
    address public juror5 = address(0x5);
    
    function setUp() public {
        zkVerifier = new MockZKVerifier();
        usdc = new MockUSDC();
        
        userRegistry = new UserRegistry(address(zkVerifier), address(usdc), gasSponsor);
        jury = new DisputeJury(address(usdc), address(userRegistry));
        
        address[5] memory jurors = [juror1, juror2, juror3, juror4, juror5];
        
        for (uint i = 0; i < 5; i++) {
            usdc.mint(jurors[i], 1000 * 10**6);
            
            vm.prank(jurors[i]);
            userRegistry.registerBasic();
            
            bytes memory zkProof = abi.encodePacked("proof", i);
            uint256[] memory signals = new uint256[](1);
            signals[0] = i;
            
            vm.prank(jurors[i]);
            userRegistry.verifyHuman(zkProof, signals);
        }
    }
    
    function testStakeAsJuror() public {
        vm.prank(juror1);
        usdc.approve(address(jury), 100 * 10**6);
        
        vm.prank(juror1);
        jury.stakeAsJuror(100 * 10**6);
        
        (uint256 staked,,, bool isActive) = jury.getJurorInfo(juror1);
        assertEq(staked, 100 * 10**6);
        assertTrue(isActive);
    }
    
    function testCannotStakeWithoutVerification() public {
        address unverified = address(0x99);
        usdc.mint(unverified, 1000 * 10**6);
        
        vm.prank(unverified);
        usdc.approve(address(jury), 100 * 10**6);
        
        vm.prank(unverified);
        vm.expectRevert(DisputeJury.NotVerifiedHuman.selector);
        jury.stakeAsJuror(100 * 10**6);
    }
    
    function testUnstake() public {
        vm.prank(juror1);
        usdc.approve(address(jury), 100 * 10**6);
        
        vm.prank(juror1);
        jury.stakeAsJuror(100 * 10**6);
        
        uint256 balanceBefore = usdc.balanceOf(juror1);
        
        vm.prank(juror1);
        jury.unstake(50 * 10**6);
        
        uint256 balanceAfter = usdc.balanceOf(juror1);
        assertEq(balanceAfter - balanceBefore, 50 * 10**6);
    }
    
    function testCreateDisputeRequiresJurors() public {
        jury.setProjectEscrowAddress(address(this));
        
        vm.expectRevert(DisputeJury.NotEnoughJurors.selector);
        jury.createDispute(1, 0, address(0x1), address(0x2), 1000 * 10**6);
    }
    
    function testCastVote() public {
        // Stake all jurors
        for (uint i = 1; i <= 5; i++) {
            address juror = address(uint160(i));
            vm.prank(juror);
            usdc.approve(address(jury), 100 * 10**6);
            
            vm.prank(juror);
            jury.stakeAsJuror(100 * 10**6);
        }
        
        jury.setProjectEscrowAddress(address(this));
        
        uint256 disputeId = jury.createDispute(1, 0, address(0x11), address(0x22), 1000 * 10**6);
        
        address[] memory jurors = jury.getDisputeJurors(disputeId);
        
        vm.prank(jurors[0]);
        jury.castVote(disputeId, DisputeJury.VoteChoice.AcceptAI);
        
        // FIXED: Removed unused 'outcome' variable to fix linter warning
        (,,,, , uint256 votesAcceptAI,,,) = jury.getDispute(disputeId);
        assertEq(votesAcceptAI, 1);
    }
}