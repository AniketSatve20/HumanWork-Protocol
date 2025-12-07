// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AIOracle.sol";
import "../src/AgencyRegistry.sol";
import "../src/SkillTrial.sol";
import "../src/UserRegistry.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";

import "./UserRegistry.t.sol";

contract AIOracleTest is Test {
    AIOracle public aiOracle;
    AgencyRegistry public agencyRegistry;
    SkillTrial public skillTrial;
    UserRegistry public userRegistry;

    MockUSDC public usdc;
    MockZKVerifier public zkVerifier;

    address public backendServer = address(0x999);
    address public admin = address(this);
    address public gasSponsor = address(0x888);
    address public agency = address(0x1);

    function setUp() public {
        usdc = new MockUSDC();
        zkVerifier = new MockZKVerifier();
        userRegistry = new UserRegistry(address(zkVerifier), address(usdc), gasSponsor);
        agencyRegistry = new AgencyRegistry(address(usdc), address(userRegistry));
        
        skillTrial = new SkillTrial(address(usdc), address(userRegistry), address(0)); 
        
        aiOracle = new AIOracle(address(agencyRegistry), address(skillTrial));

        aiOracle.transferOwnership(backendServer);
        agencyRegistry.setAiOracle(address(aiOracle));
        skillTrial.setAiOracle(address(aiOracle));
    }

    function testOwner() public view { 
        assertEq(aiOracle.owner(), backendServer);
    }

    function testSetSkillTrial() public {
        vm.prank(backendServer);
        aiOracle.setSkillTrial(address(0x123));
        assertEq(aiOracle.skillTrialAddress(), address(0x123));
    }

    function testSetSkillTrialNotOwner() public {
        vm.startPrank(address(0x123));
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, address(0x123))
        );
        aiOracle.setSkillTrial(address(0x123));
        vm.stopPrank();
    }

    function testRequestGstVerification() public {
        vm.expectRevert("Only AgencyRegistry");
        aiOracle.requestGstVerification(1, bytes32(0));
    }
    
    function testFulfillGstVerification() public {
        usdc.mint(agency, 1000 * 10**6);
        
        vm.prank(agency);
        usdc.approve(address(agencyRegistry), 500 * 10**6);
        
        bytes32 gstHash = keccak256(abi.encodePacked("GST123"));
        
        vm.prank(agency);
        uint256 agencyId = agencyRegistry.registerAgency("TechCorp", gstHash);
        
        // The Job ID for the first agency is 0
        uint256 jobId = 0; 
        
        vm.prank(backendServer);
        aiOracle.fulfillGstVerification(jobId, agencyId, true);
        
        (,,, bool isVerified,,,) = agencyRegistry.getAgency(agencyId);
        assertTrue(isVerified);
    }
}
