// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/EnterpriseAccess.sol";
import "../src/AgencyRegistry.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";

import "./UserRegistry.t.sol";

contract EnterpriseAccessTest is Test {
    EnterpriseAccess public enterpriseAccess;
    AgencyRegistry public agencyRegistry;
    UserRegistry public userRegistry;
    MockUSDC public usdc;
    MockZKVerifier public zkVerifier;

    address public subAdmin = address(0x1);
    address public agencyOwner = address(0x2);
    address public gasSponsor = address(0x888);

    function setUp() public {
        usdc = new MockUSDC();
        zkVerifier = new MockZKVerifier();
        userRegistry = new UserRegistry(address(zkVerifier), address(usdc), gasSponsor);
        agencyRegistry = new AgencyRegistry(address(usdc), address(userRegistry));
        enterpriseAccess = new EnterpriseAccess(address(usdc), address(agencyRegistry));

        // Fund accounts
        usdc.mint(subAdmin, 10000 * 10 ** 6);
        usdc.mint(agencyOwner, 10000 * 10 ** 6);
    }

    function testSubscribeClient() public {
        vm.prank(subAdmin);
        usdc.approve(address(enterpriseAccess), 5000 * 10 ** 6);

        vm.prank(subAdmin);
        uint256 nftId = enterpriseAccess.subscribe(EnterpriseAccess.Tier.ClientAnnual, "ClientCo");

        assertTrue(enterpriseAccess.isEnterpriseUser(subAdmin));
        assertEq(enterpriseAccess.ownerOf(nftId), subAdmin);
    }

    function testSubscribeAgency() public {
        vm.prank(agencyOwner);
        usdc.approve(address(enterpriseAccess), 1000 * 10 ** 6);

        vm.prank(agencyOwner);
        uint256 nftId = enterpriseAccess.subscribe(EnterpriseAccess.Tier.AgencyAnnual, "AgencyCo");

        assertTrue(enterpriseAccess.isEnterpriseUser(agencyOwner));
        assertEq(enterpriseAccess.ownerOf(nftId), agencyOwner);
    }
}
