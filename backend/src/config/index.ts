import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  hedera: {
    rpcUrl: process.env.HEDERA_RPC_URL || 'https://testnet.hashio.io/api',
    chainId: parseInt(process.env.HEDERA_CHAIN_ID || '296'),
  },
  oracle: {
    privateKey: process.env.ORACLE_PRIVATE_KEY || '',
    address: process.env.ORACLE_ADDRESS || '',
  },
  contracts: {
    usdc: process.env.USDC_ADDRESS || '',
    userRegistry: process.env.USER_REGISTRY_ADDRESS || '',
    agencyRegistry: process.env.AGENCY_REGISTRY_ADDRESS || '',
    aiOracle: process.env.AI_ORACLE_ADDRESS || '',
    skillTrial: process.env.SKILL_TRIAL_ADDRESS || '',
    projectEscrow: process.env.PROJECT_ESCROW_ADDRESS || '',
    disputeJury: process.env.DISPUTE_JURY_ADDRESS || '',
    enterpriseAccess: process.env.ENTERPRISE_ACCESS_ADDRESS || '',
    gasSponsor: process.env.GAS_SPONSOR_ADDRESS || '',
    insurancePool: process.env.INSURANCE_POOL_ADDRESS || '',
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/humanwork',
  },
  pinata: {
    apiKey: process.env.PINATA_API_KEY || '',
    secretKey: process.env.PINATA_SECRET_KEY || '',
    jwt: process.env.PINATA_JWT || '',
    gateway: process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs',
  },
  huggingface: {
    apiKey: process.env.HUGGINGFACE_API_KEY || '',
    model: process.env.HUGGINGFACE_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'unsafe-default-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || '12345678901234567890123456789012',
    algorithm: 'aes-256-cbc',
  },
  polling: {
    interval: parseInt(process.env.POLLING_INTERVAL || '3000'),
    startBlock: parseInt(process.env.START_BLOCK || '0'),
  },
};

export default config;
