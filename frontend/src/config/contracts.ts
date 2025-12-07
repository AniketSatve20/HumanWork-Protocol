// src/config/contracts.ts

export const CONTRACT_ADDRESSES = {
  // Replace these defaults with your actual deployed addresses from the backend logs
  USDC: import.meta.env.VITE_USDC_ADDRESS || "0x016401da957B04C1874a744319FD4793278866ee",
  PROJECT_ESCROW: import.meta.env.VITE_PROJECT_ESCROW_ADDRESS || "0xC630c7556776367ecaA5DdF6b84A41A2c3e47afD",
  AI_ORACLE: import.meta.env.VITE_AI_ORACLE_ADDRESS || "",
  SKILL_TRIAL: import.meta.env.VITE_SKILL_TRIAL_ADDRESS || "",
  USER_REGISTRY: import.meta.env.VITE_USER_REGISTRY_ADDRESS || ""
};

export const CONTRACT_ABIS = {
  USDC: [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function decimals() view returns (uint8)"
  ],
  PROJECT_ESCROW: [
    "function createProject(address freelancer, uint256[] calldata amounts, string[] calldata milestones) external",
    "function getProject(uint256 projectId) view returns (address client, address freelancer, uint8 status)",
    "function projectCounter() view returns (uint256)",
    "event ProjectCreated(uint256 indexed projectId, address indexed client, address indexed freelancer)"
  ],
  SKILL_TRIAL: [
    "function submitTrial(uint256 trialId, string calldata ipfsHash) external",
    "function getTrial(uint256 trialId) view returns (string title, uint256 fee, bool isActive)"
  ]
};