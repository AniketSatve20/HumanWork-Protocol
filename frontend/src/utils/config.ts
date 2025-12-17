// Environment configuration
export const config = {
  // API
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  
  // Blockchain
  chainId: parseInt(import.meta.env.VITE_CHAIN_ID || '296'),
  rpcUrl: import.meta.env.VITE_RPC_URL || 'https://testnet.hashio.io/api',
  
  // Contract Addresses
  contracts: {
    usdc: import.meta.env.VITE_USDC_ADDRESS || '0x9DF33f0745FA9d8BD6997B2B848a44dC19026411',
    userRegistry: import.meta.env.VITE_USER_REGISTRY_ADDRESS || '0x0E0697A6E35ED0170cEB71330d545d8288fd9164',
    agencyRegistry: import.meta.env.VITE_AGENCY_REGISTRY_ADDRESS || '0x829f593373D7D786e2c6555513204518343ca4AA',
    aiOracle: import.meta.env.VITE_AI_ORACLE_ADDRESS || '0x9cA136e116e6d508c74Ce159Ea740b687e7e0fD2',
    skillTrial: import.meta.env.VITE_SKILL_TRIAL_ADDRESS || '0xE2f95F621Cb4b03BDC26cB14ADBd234Aa694068B',
    projectEscrow: import.meta.env.VITE_PROJECT_ESCROW_ADDRESS || '0x3C145424E56FB6db389aFcbE5E834b450Fd4CB7d',
    disputeJury: import.meta.env.VITE_DISPUTE_JURY_ADDRESS || '0x3bB6f801aBe3333A394d3f69ACC3246d565c8266',
    enterpriseAccess: import.meta.env.VITE_ENTERPRISE_ACCESS_ADDRESS || '0x0029f314afe2581EBC568d1a5794273c239834C7',
    gasSponsor: import.meta.env.VITE_GAS_SPONSOR_ADDRESS || '0x969CdA619c2Bf66cEE9c527dCd4878C8c52AEf95',
    insurancePool: import.meta.env.VITE_INSURANCE_POOL_ADDRESS || '0x6F13f4d74236ec258FCE50fA86180f5a87acFc60',
  },
  
  // App
  appName: 'HumanWork Protocol',
  appDescription: 'Decentralized B2B Freelancing Platform',
};

export default config;
