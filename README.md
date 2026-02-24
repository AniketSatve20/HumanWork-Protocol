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

## 📊 Project Status — Percentile Review

> Last updated: February 2026

### Overall Completion: **~62% on main** · **~69% including pending PRs**

```
Overall Progress (main branch)
████████████████████░░░░░░░░░░░░  62%

Overall Progress (with pending PRs #2 & #3)
██████████████████████░░░░░░░░░░  69%
```

### Component Breakdown

| Component | Completion | On Main | With Pending PRs | What's Done | What's Missing |
|-----------|:----------:|:-------:|:----------------:|-------------|----------------|
| **Smart Contracts** | 95% | ✅ | ✅ | 9 core + 3 mock contracts fully implemented | PR #3 adds 2.5% platform fee to escrow; no formal audit |
| **Contract Tests** | 90% | ✅ | ✅ | 10 test files (9 unit + 1 integration) via Foundry | Edge-case & adversarial testing, gas optimization review |
| **Backend API** | 70→90% | ⚠️ | ✅ | 7 routes, 7 models, 3 services, 2 workers on main | PR #2: disputes, milestones, TS fixes · PR #3: reviews, notifications, rate limiting |
| **Frontend UI** | 65→85% | ⚠️ | ✅ | 8 pages, 3 stores, wallet connect on main | PR #2: profile page, disputes UI · PR #3: skills flow, verification page, disputes UI |
| **Backend Tests** | 0% | ❌ | ❌ | vitest configured in package.json | No test files exist; 0 unit/integration tests |
| **Frontend Tests** | 0% | ❌ | ❌ | None | No test infrastructure |
| **Build Health** | 60→75% | ⚠️ | ⚠️ | Contracts compile clean | Backend: 5 TS errors (PR #2 fixes) · Frontend: missing `lucide-react`, unused imports |
| **Documentation** | 50% | ⚠️ | ⚠️ | README comprehensive | No ARCHITECTURE.md, DEPLOYMENT.md, API docs, JSDoc |
| **DevOps / CI** | 20% | ⚠️ | ⚠️ | Foundry Makefile, testnet deploy script | No CI/CD pipeline, no Docker, no monitoring |
| **Security** | 40% | ⚠️ | ⚠️ | OpenZeppelin, Ownable on escrow (PR #1) | No audit, no SAST, rate limiting only in PR #3 |
| **Production Readiness** | 15% | ❌ | ❌ | Testnet config exists | No mainnet deploy, no monitoring, no logging infra, no LICENSE |

### Work Completed by PR

| PR | Status | Summary | Impact |
|----|--------|---------|--------|
| **PR #1** | ✅ Merged | Job creation flow fix, listings/applications system, escrow security (`onlyOwner`) | +889 / −7472 lines (44 files) |
| **PR #2** | 🔶 Open | Dispute resolution API, milestone mgmt, profile page, backend TS error fixes | +2106 / −642 lines (27 files) |
| **PR #3** | 🔶 Open | Platform fees, skill testing UI, verification page, reviews, notifications, rate limiting | +2121 / −15 lines (23 files) |
| **PR #4** | 🔶 Open | Project status documentation, .gitignore cleanup, build artifact removal | This PR |

### Remaining Work to Reach 100%

- [ ] **Merge PR #2** — dispute resolution, milestone management, profile page, TS fixes
- [ ] **Merge PR #3** — platform fees, skill testing, verification, reviews, notifications
- [ ] **Backend tests** — unit tests for all 7+ route groups, service mocks (0% → target 80%+)
- [ ] **Frontend tests** — component tests, integration tests (0% → target 70%+)
- [ ] **Fix frontend build** — install `lucide-react`, clean unused imports
- [ ] **CI/CD pipeline** — GitHub Actions for lint + test + build on PR
- [ ] **Security audit** — smart contract audit, dependency scanning
- [ ] **Documentation** — API reference (OpenAPI/Swagger), architecture diagrams, deployment guide
- [ ] **Production config** — Docker, environment management, monitoring, error tracking
- [ ] **LICENSE file** — add MIT license file
- [ ] **Mainnet deployment** — production contract deployment, verification on explorer

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Run tests (`make test && make fmt`)
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing`)
6. Open Pull Request

## 📄 License

MIT License

## 🙏 Acknowledgments

- Hedera for EVM-compatible infrastructure
- Filecoin/IPFS for decentralized storage
- Hugging Face for AI inference
- OpenZeppelin for secure contract libraries
