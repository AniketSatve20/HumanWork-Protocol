import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  hedera: {
    rpcUrl: process.env.HEDERA_RPC_URL || 'https://testnet.hashio.io/api',
    chainId: parseInt(process.env.HEDERA_CHAIN_ID || '296'),
  },
  oracle: {
    privateKey: process.env.ORACLE_PRIVATE_KEY || '',
  },
  contracts: {
    projectEscrow: process.env.PROJECT_ESCROW_ADDRESS || '',
    aiOracle: process.env.AI_ORACLE_ADDRESS || '',
    skillTrial: process.env.SKILL_TRIAL_ADDRESS || '',
    userRegistry: process.env.USER_REGISTRY_ADDRESS || '',
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/humanwork',
  },
  pinata: {
    apiKey: process.env.PINATA_API_KEY || '',
    secretKey: process.env.PINATA_SECRET_API_KEY || '',
  },
  huggingface: {
    apiKey: process.env.HUGGINGFACE_API_KEY || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'unsafe-secret',
  }
};