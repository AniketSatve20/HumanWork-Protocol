// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/UserRegistry.sol";
import "../src/AgencyRegistry.sol";
import "../src/AIOracle.sol";
import "../src/SkillTrial.sol";
import "../src/ProjectEscrow.sol";
import "../src/EnterpriseAccess.sol";
import "../src/DisputeJury.sol";
import "../src/GasSponsor.sol";
import "../src/InsurancePool.sol";
import "../src/mocks/MockUSDC.sol";
import "../src/mocks/MockVerifier.sol";

contract DeployProtocol is Script {
    address public STABLECOIN_ADDRESS;
    address public ZK_VERIFIER_ADDRESS;
    address public oracleAdmin;

    address public demoClient = 0xBe19FFa61889b67802F4ff9E7Cb01Dd17105C05f;
    address public demoFreelancer = 0x9aaa47E69eB507a4510bbC7Ba745A5BBeA6c718c;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        oracleAdmin = vm.envAddress("ORACLE_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // ============ 0. DEPLOY MOCKS (TESTNET ONLY) ============
        console.log("Deploying Mocks...");
        MockUSDC mockUSDC = new MockUSDC();
        STABLECOIN_ADDRESS = address(mockUSDC);
        console.log("  + MockUSDC deployed to:", STABLECOIN_ADDRESS);

        MockVerifier mockVerifier = new MockVerifier();
        ZK_VERIFIER_ADDRESS = address(mockVerifier);
        console.log("  + MockVerifier deployed to:", ZK_VERIFIER_ADDRESS);

        // ============ 1. DEPLOY CORE MODULES ============
        console.log("\nDeploying Core Modules...");
        GasSponsor gasSponsor = new GasSponsor(STABLECOIN_ADDRESS);
        console.log("  + GasSponsor deployed to:", address(gasSponsor));

        InsurancePool insurancePool = new InsurancePool(STABLECOIN_ADDRESS);
        console.log("  + InsurancePool deployed to:", address(insurancePool));

        // ============ 2. DEPLOY IDENTITY & AI LAYER ============
        console.log("\nDeploying Identity & AI Layer...");
        UserRegistry userRegistry = new UserRegistry(ZK_VERIFIER_ADDRESS, STABLECOIN_ADDRESS, address(gasSponsor));
        console.log("  + UserRegistry deployed to:", address(userRegistry));

        AgencyRegistry agencyRegistry = new AgencyRegistry(STABLECOIN_ADDRESS, address(userRegistry));
        console.log("  + AgencyRegistry deployed to:", address(agencyRegistry));

        AIOracle aiOracle = new AIOracle(address(agencyRegistry), address(0));
        console.log("  + AIOracle deployed to:", address(aiOracle));

        SkillTrial skillTrial = new SkillTrial(STABLECOIN_ADDRESS, address(userRegistry), address(aiOracle));
        console.log("  + SkillTrial deployed to:", address(skillTrial));

        // ============ 3. DEPLOY COMMERCE & DISPUTE LAYER ============
        console.log("\nDeploying Commerce & Dispute Layer...");
        DisputeJury disputeJury = new DisputeJury(STABLECOIN_ADDRESS, address(userRegistry));
        console.log("  + DisputeJury deployed to:", address(disputeJury));

        EnterpriseAccess enterpriseAccess = new EnterpriseAccess(STABLECOIN_ADDRESS, address(agencyRegistry));
        console.log("  + EnterpriseAccess deployed to:", address(enterpriseAccess));

        ProjectEscrow projectEscrow = new ProjectEscrow(
            STABLECOIN_ADDRESS, address(userRegistry), address(agencyRegistry), address(enterpriseAccess)
        );
        console.log("  + ProjectEscrow deployed to:", address(projectEscrow));

        // ============ 4. SET PERMISSIONS ============
        console.log("\nSetting Permissions...");

        aiOracle.setSkillTrial(address(skillTrial));
        aiOracle.transferOwnership(oracleAdmin);
        console.log("  + AIOracle ownership transferred to:", oracleAdmin);

        agencyRegistry.setAiOracle(address(aiOracle));
        skillTrial.setAiOracle(address(aiOracle));

        disputeJury.setProjectEscrowAddress(address(projectEscrow));
        projectEscrow.setDisputeJuryAddress(address(disputeJury));

        userRegistry.setAuthorizedCaller(address(projectEscrow), true);
        userRegistry.setAuthorizedCaller(address(skillTrial), true);

        gasSponsor.authorizeContract(address(userRegistry), true);
        console.log("  + All permissions set");

        // ============ 5. SEED DATA ============
        console.log("\nSeeding Data...");

        mockUSDC.mint(demoClient, 50000 * 10 ** 6);
        mockUSDC.mint(demoFreelancer, 10000 * 10 ** 6);
        mockUSDC.mint(msg.sender, 100000 * 10 ** 6);

        userRegistry.registerBasic();
        bytes memory emptyProof = new bytes(0);
        uint256[] memory emptySignals = new uint256[](0);
        userRegistry.verifyHuman(emptyProof, emptySignals);

        mockUSDC.approve(address(agencyRegistry), 500 * 10 ** 6);
        agencyRegistry.registerAgency("TechCorp Solutions", keccak256("GST123456789"));

        // Skill tests
        skillTrial.createTest(
            "Junior Solidity Developer", "Basics of Solidity", "QmJuniorSolidityHash", 10 * 10 ** 6
        );
        skillTrial.createTest(
            "Smart Contract Security Auditor", "Security patterns", "QmSecurityHash", 25 * 10 ** 6
        );
        skillTrial.createTest(
            "DeFi Protocol Architect", "DeFi expertise", "QmDeFiHash", 50 * 10 ** 6
        );
        console.log("  + Seeded users, agency, and 3 skill tests");

        vm.stopBroadcast();

        console.log("\n+ HumanWork Protocol V6 Deployed Successfully!");

        console.log("\n========== DEPLOYMENT ADDRESSES ==========");
        console.log("VITE_USDC_ADDRESS=", STABLECOIN_ADDRESS);
        console.log("VITE_USER_REGISTRY_ADDRESS=", address(userRegistry));
        console.log("VITE_AGENCY_REGISTRY_ADDRESS=", address(agencyRegistry));
        console.log("VITE_AI_ORACLE_ADDRESS=", address(aiOracle));
        console.log("VITE_SKILL_TRIAL_ADDRESS=", address(skillTrial));
        console.log("VITE_PROJECT_ESCROW_ADDRESS=", address(projectEscrow));
        console.log("VITE_DISPUTE_JURY_ADDRESS=", address(disputeJury));
        console.log("VITE_ENTERPRISE_ACCESS_ADDRESS=", address(enterpriseAccess));
        console.log("VITE_GAS_SPONSOR_ADDRESS=", address(gasSponsor));
        console.log("VITE_INSURANCE_POOL_ADDRESS=", address(insurancePool));
    }
}
