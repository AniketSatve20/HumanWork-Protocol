// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AgencyRegistry.sol";
import "../src/UserRegistry.sol";
import "../src/interfaces/IZKVerifier.sol";

// Import mocks from UserRegistry test
import "./UserRegistry.t.sol";

contract AgencyRegistryTest is Test {
    AgencyRegistry public agencyRegistry;
    UserRegistry public userRegistry;
    MockZKVerifier public zkVerifier;
    MockUSDC public usdc;
    
    address public companyOwner = address(0x1);
    address public employee1 = address(0x2);
    address public employee2 = address(0x3);
    address public gasSponsor = address(0x999);
    
    function setUp() public {
        zkVerifier = new MockZKVerifier();
        usdc = new MockUSDC();
        
        userRegistry = new UserRegistry(address(zkVerifier), address(usdc), gasSponsor);
        agencyRegistry = new AgencyRegistry(address(usdc), address(userRegistry));
        
        usdc.mint(companyOwner, 1000 * 10**6);
        
        // Register and verify employees
        vm.prank(employee1);
        userRegistry.registerBasic();
        bytes memory proof1 = abi.encodePacked("proof1");
        uint256[] memory signals1 = new uint256[](1);
        signals1[0] = 1;
        vm.prank(employee1);
        userRegistry.verifyHuman(proof1, signals1);
        
        vm.prank(employee2);
        userRegistry.registerBasic();
        bytes memory proof2 = abi.encodePacked("proof2");
        uint256[] memory signals2 = new uint256[](1);
        signals2[0] = 2;
        vm.prank(employee2);
        userRegistry.verifyHuman(proof2, signals2);
    }
    
    function testRegisterAgency() public {
        vm.prank(companyOwner);
        usdc.approve(address(agencyRegistry), 500 * 10**6);
        
        bytes32 gstHash = keccak256(abi.encodePacked("GST123456"));
        
        vm.prank(companyOwner);
        uint256 agencyId = agencyRegistry.registerAgency("TechCorp", gstHash);
        
        (address owner,,,,,, bool isActive) = agencyRegistry.getAgency(agencyId);
        assertEq(owner, companyOwner);
        assertTrue(isActive);
    }
    
    function testAddTeamMember() public {
        vm.prank(companyOwner);
        usdc.approve(address(agencyRegistry), 500 * 10**6);
        
        bytes32 gstHash = keccak256(abi.encodePacked("GST123456"));
        
        vm.prank(companyOwner);
        agencyRegistry.registerAgency("TechCorp", gstHash);
        
        vm.prank(companyOwner);
        agencyRegistry.addTeamMember(employee1);
        
        uint256 agencyId = agencyRegistry.getAgencyIdByOwner(companyOwner);
        assertTrue(agencyRegistry.isTeamMember(agencyId, employee1));
    }
    
    function testCannotAddNonVerifiedHuman() public {
        address unverified = address(0x999);
        
        vm.prank(companyOwner);
        usdc.approve(address(agencyRegistry), 500 * 10**6);
        
        bytes32 gstHash = keccak256(abi.encodePacked("GST123456"));
        
        vm.prank(companyOwner);
        agencyRegistry.registerAgency("TechCorp", gstHash);
        
        vm.prank(companyOwner);
        vm.expectRevert(AgencyRegistry.NotVerifiedHuman.selector);
        agencyRegistry.addTeamMember(unverified);
    }
    
    function testRemoveTeamMember() public {
        vm.prank(companyOwner);
        usdc.approve(address(agencyRegistry), 500 * 10**6);
        
        bytes32 gstHash = keccak256(abi.encodePacked("GST123456"));
        
        vm.prank(companyOwner);
        agencyRegistry.registerAgency("TechCorp", gstHash);
        
        vm.prank(companyOwner);
        agencyRegistry.addTeamMember(employee1);
        
        vm.prank(companyOwner);
        agencyRegistry.removeTeamMember(employee1);
        
        uint256 agencyId = agencyRegistry.getAgencyIdByOwner(companyOwner);
        assertFalse(agencyRegistry.isTeamMember(agencyId, employee1));
    }
}
