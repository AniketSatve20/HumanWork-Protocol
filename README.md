# HumanWork Protocol V5

A decentralized B2B freelancing platform with AI-powered skill verification, escrow services, and dispute resolution.

## 🎯 Features

- **Smart Contract Escrow**: Secure milestone-based payments
- **AI-Powered Dispute Resolution**: 48-hour resolution with AI-PM
- **ZK-KYC Verification**: Privacy-preserving human verification
- **Skill Verification**: AI-graded tests with NFT badges
- **B2B Focus**: GST verification for Indian market
- **0% Transaction Fees**: SaaS subscription model

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                       │
│  • Wallet Connection (MetaMask/WalletConnect)                        │
│  • Dashboard, Project Management, Skill Tests                        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js + Express)                     │
│  • REST API                      • AI Oracle Worker                  │
│  • IPFS/Filecoin Integration     • Hugging Face AI Grading          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     BLOCKCHAIN (Hedera Testnet)                      │
│  ┌─────────────┐  ┌───────────────┐  ┌─────────────────┐            │
│  │UserRegistry │  │AgencyRegistry │  │   AIOracle      │            │
│  └─────────────┘  └───────────────┘  └─────────────────┘            │
│  ┌─────────────┐  ┌───────────────┐  ┌─────────────────┐            │
│  │ProjectEscrow│  │  SkillTrial   │  │  DisputeJury    │            │
│  └─────────────┘  └───────────────┘  └─────────────────┘            │
│  ┌─────────────┐  ┌───────────────┐  ┌─────────────────┐            │
│  │EnterpriseAcc│  │  GasSponsor   │  │ InsurancePool   │            │
│  └─────────────┘  └───────────────┘  └─────────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

| Layer       | Technology                                      |
|-------------|------------------------------------------------|
| Blockchain  | Hedera (EVM-compatible via HashIO)             |
| Smart Contracts | Solidity ^0.8.20, Foundry, OpenZeppelin    |
| Backend     | Node.js, Express, TypeScript                   |
| Frontend    | React, Vite, TailwindCSS, ethers.js v6         |
| Storage     | IPFS/Filecoin (Web3.Storage)                   |
| AI          | Hugging Face Inference API (Mistral-7B)        |
| Database    | MongoDB Atlas                                  |

## 📦 Project Structure

```
humanwork-protocol/
├── contracts/           # Solidity smart contracts (Foundry)
│   ├── src/            # Contract source files (10 contracts)
│   ├── script/         # Deployment scripts
│   ├── test/           # Contract tests (9 test files)
│   ├── Makefile        # Build commands
│   └── foundry.toml    # Foundry configuration
├── backend/            # Node.js backend service
│   ├── src/
│   │   ├── routes/     # API endpoints (users, projects, skills)
│   │   ├── services/   # Business logic (ai, ipfs, blockchain)
│   │   ├── workers/    # AI Oracle worker
│   │   └── config/     # Configuration
│   └── package.json
├── frontend/           # React frontend
│   ├── src/
│   │   ├── components/ # React components (pages, layout, ui)
│   │   ├── services/   # Contract interaction
│   │   └── stores/     # Zustand state management
│   └── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- Foundry (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- MetaMask wallet
- Hedera testnet HBAR (get from https://testnet.hedera.com)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/humanwork-protocol.git
cd humanwork-protocol

# Install dependencies
npm run install:all

# Or manually:
cd contracts && forge install
cd ../backend && npm install
cd ../frontend && npm install
```

### 2. Environment Setup

```bash
# Contracts
cp contracts/.env.local.example contracts/.env.local
# Edit with your private key

# Backend
cp backend/.env.example backend/.env
# Add API keys and contract addresses

# Frontend
cp frontend/.env.example frontend/.env
# Add contract addresses
```

### 3. Deploy Contracts (Hedera Testnet)

```bash
cd contracts
make build
make deploy-testnet
# Save the output addresses!
```

### 4. Run Tests

```bash
# Smart Contract Tests
cd contracts && make test

# System Integration Test
chmod +x test_system.sh
./test_system.sh
```

### 5. Start Services

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

## 🔑 Smart Contracts

### Layer 1: Identity & Trust
| Contract | Purpose |
|----------|---------|
| **UserRegistry** | ZK-KYC verification, attestations, ENS linking |
| **AgencyRegistry** | B2B registration, GST verification, team management |

### Layer 1.5: AI Verification
| Contract | Purpose |
|----------|---------|
| **AIOracle** | Centralized AI brain for verification jobs |
| **SkillTrial** | AI-graded tests, NFT badge minting (ERC721) |

### Layer 2: Commerce & Disputes
| Contract | Purpose |
|----------|---------|
| **ProjectEscrow** | Milestone payments, scope creep handling |
| **DisputeJury** | 5-juror voting, AI-assisted verdicts |
| **EnterpriseAccess** | SaaS NFT subscriptions (ERC721) |

### Supporting Infrastructure
| Contract | Purpose |
|----------|---------|
| **GasSponsor** | Gasless UX via USDC deposits |
| **InsurancePool** | 5% premium, 100% coverage |
| **MockUSDC** | Test stablecoin (6 decimals) |

## 🧪 Testing

### Contract Tests
```bash
cd contracts
make test           # Run all tests
make gas-report     # Gas usage report
make fmt            # Format code
```

### System Test
```bash
cd contracts
./test_system.sh    # Full integration test
```

Expected output:
```
✅ User registered successfully
✅ USDC minted
✅ Escrow approved
✅ Project created
✅ Dispute raised
Check Backend Terminal for AI-PM Logs!
```

## 📡 API Endpoints

### Users
- `POST /api/users/nonce` - Get signing nonce
- `POST /api/users/verify` - Verify wallet signature
- `GET /api/users/:address` - Get user profile
- `GET /api/users/:address/reputation` - Get reputation score

### Projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects/upload-brief` - Upload to IPFS
- `POST /api/projects/:id/deliverable` - Upload deliverable
- `GET /api/projects/user/:address` - Get user's projects

### Skills
- `GET /api/skills/tests` - List available tests
- `GET /api/skills/tests/:id` - Get test details
- `POST /api/skills/submit` - Submit test attempt
- `GET /api/skills/badges/:address` - Get user badges

## 💰 Business Model

### Revenue Streams
1. **Enterprise Subscriptions**: $500-$10,000/year
2. **Agency Subscriptions**: $100-$1,000/year
3. **Skill Test Fees**: $10-$50 per test
4. **Insurance Premiums**: 5% of project value
5. **Dispute Fees**: 10% of disputed amount

### Value Proposition
| Feature | Traditional (Upwork) | HumanWork |
|---------|---------------------|-----------|
| Transaction Fee | 20% | **0%** |
| Dispute Resolution | 30-90 days | **48 hours** |
| Skill Verification | Self-reported | **AI-graded** |
| Payment Protection | Manual escrow | **Smart contract** |

## 🔗 Network Info

- **Network**: Hedera Testnet
- **Chain ID**: 296
- **RPC**: https://testnet.hashio.io/api
- **Explorer**: https://testnet.hashscan.io

## 📚 Documentation

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System design
- [DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Deployment guide
- [TESTING.md](./docs/TESTING.md) - Testing procedures
- [QUICK_START.md](./docs/QUICK_START.md) - 5-minute setup

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Run tests (`make test && make fmt`)
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing`)
6. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Hedera for EVM-compatible infrastructure
- Filecoin/IPFS for decentralized storage
- Hugging Face for AI inference
- OpenZeppelin for secure contract libraries
