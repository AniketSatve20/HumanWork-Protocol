// Environment configuration
export const config = {
  // API
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  
  // Blockchain
  chainId: parseInt(import.meta.env.VITE_CHAIN_ID || '296'),
  rpcUrl: import.meta.env.VITE_RPC_URL || 'https://testnet.hashio.io/api',
  
  // Contract Addresses
  contracts: {
    usdc: import.meta.env.VITE_USDC_ADDRESS || '',
    userRegistry: import.meta.env.VITE_USER_REGISTRY_ADDRESS || '',
    agencyRegistry: import.meta.env.VITE_AGENCY_REGISTRY_ADDRESS || '',
    aiOracle: import.meta.env.VITE_AI_ORACLE_ADDRESS || '',
    skillTrial: import.meta.env.VITE_SKILL_TRIAL_ADDRESS || '',
    projectEscrow: import.meta.env.VITE_PROJECT_ESCROW_ADDRESS || '',
    disputeJury: import.meta.env.VITE_DISPUTE_JURY_ADDRESS || '',
    enterpriseAccess: import.meta.env.VITE_ENTERPRISE_ACCESS_ADDRESS || '',
  },
  
  // App
  appName: 'HumanWork Protocol',
  appDescription: 'Decentralized B2B Freelancing Platform',
};

export default config;
