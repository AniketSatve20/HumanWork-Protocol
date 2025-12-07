// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/GasSponsor.sol";

import "./UserRegistry.t.sol";

contract GasSponsorTest is Test {
    GasSponsor public gasSponsor;
    MockUSDC public usdc;
    
    address public user = address(0x1);
    address public authorizedContract = address(0x2);
    
    function setUp() public {
        usdc = new MockUSDC();
        gasSponsor = new GasSponsor(address(usdc));
        
        usdc.mint(user, 1000 * 10**6);
        
        gasSponsor.authorizeContract(authorizedContract, true);
    }
    
    function testReceiveDeposit() public {
        vm.prank(user);
        usdc.approve(address(gasSponsor), 10 * 10**6);
        
        vm.prank(user);
        gasSponsor.receiveDeposit(user, 10 * 10**6);
        
        uint256 balance = gasSponsor.getUserBalance(user);
        assertEq(balance, 10 * 10**6);
    }
    
    function testSponsorGas() public {
        vm.prank(user);
        usdc.approve(address(gasSponsor), 10 * 10**6);
        
        vm.prank(user);
        gasSponsor.receiveDeposit(user, 10 * 10**6);
        
        vm.prank(authorizedContract);
        gasSponsor.sponsorGas(user, 1 * 10**6);
        
        uint256 balance = gasSponsor.getUserBalance(user);
        assertEq(balance, 9 * 10**6);
    }
    
    function testCannotSponsorFromUnauthorized() public {
        vm.prank(user);
        usdc.approve(address(gasSponsor), 10 * 10**6);
        
        vm.prank(user);
        gasSponsor.receiveDeposit(user, 10 * 10**6);
        
        vm.prank(address(0x999));
        vm.expectRevert(GasSponsor.UnauthorizedContract.selector);
        gasSponsor.sponsorGas(user, 1 * 10**6);
    }
}
