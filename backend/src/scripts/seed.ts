/**
 * HumanWork Protocol — Westworld / Delos Themed Seed Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Populates MongoDB with immersive, Westworld-themed data for a
 * high-end B2B freelancing platform.
 *
 *   Collections seeded:
 *     • 10 Users         – Narrative Profiles (Core Drive, Improvisation Score, Cornerstone Memory)
 *     • 5  Agencies       – Delos-era corporate divisions, GST verification status
 *     • 15 Job Listings   – Narrative Engineering / Biometric Verification / Substrate Maintenance
 *     • 20 Skill Subs     – AI-graded test results (score 0-100)
 *
 *   Status Terminology:
 *     • 'Completed' → 'Settled Narrative'
 *     • 'In Progress' → 'Active Loop'
 *
 *   Logic:
 *     1. Deletes ALL existing data in the four target collections (idempotent).
 *     2. Inserts via Promise.all for high-performance parallel writes.
 *     3. Logs a success message per collection.
 *
 *   Usage:
 *     npx tsx src/scripts/seed.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import User, { LegitimacyLevel } from '../models/User.js';
import { JobListing } from '../models/JobListing.js';
import { SkillSubmission, SubmissionStatus } from '../models/SkillSubmission.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/humanwork';

/* ═══════════════════════════════════════════════════════════════════════════
   Agency Model — Lightweight Mongoose mirror of AgencyRegistry.sol
   ═══════════════════════════════════════════════════════════════════════════ */

interface IAgency extends Document {
  agencyId: number;
  owner: string;
  companyName: string;
  gstNumberHash: string;
  isGstVerified: boolean;
  stakeAmount: string;
  isActive: boolean;
  team: string[];
  registeredAt: Date;
}

const AgencySchema = new Schema<IAgency>(
  {
    agencyId:      { type: Number, required: true, unique: true },
    owner:         { type: String, required: true, index: true },
    companyName:   { type: String, required: true },
    gstNumberHash: { type: String, required: true },
    isGstVerified: { type: Boolean, default: false },
    stakeAmount:   { type: String, default: '0' },
    isActive:      { type: Boolean, default: true },
    team:          [{ type: String }],
    registeredAt:  { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Agency = mongoose.models.Agency || mongoose.model<IAgency>('Agency', AgencySchema);

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════════ */

/** Generate a deterministic-looking but unique 42-char hex wallet address. */
function wallet(tag: string, index: number): string {
  const hash = crypto.createHash('sha256').update(`${tag}-${index}`).digest('hex');
  return '0x' + hash.slice(0, 40);
}

/** Fake GST hash (keccak-style hex). */
function gstHash(name: string): string {
  return '0x' + crypto.createHash('sha256').update(`gst-${name}`).digest('hex');
}

/** Fake IPFS CID. */
function cid(label: string): string {
  return 'Qm' + crypto.createHash('sha256').update(label).digest('hex').slice(0, 44);
}

/** Fake tx hash. */
function txHash(n: number): string {
  return '0x' + crypto.createHash('sha256').update(`tx-${n}`).digest('hex');
}

/** Return a Date `n` days before right now — spreads data across the last 30 days. */
function daysAgo(n: number, jitterHours = 0): Date {
  const ms = Date.now() - n * 86_400_000 - Math.floor(Math.random() * jitterHours * 3_600_000);
  return new Date(ms);
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. USERS  (10)
   ═══════════════════════════════════════════════════════════════════════════ */

const users = [
  {
    walletAddress: wallet('user', 1),
    level: LegitimacyLevel.VerifiedHuman,
    hasDeposited: true,
    displayName: 'Kael-9 Nakamura',
    bio: '[NARRATIVE PROFILE] Core Drive: "To prove synthetic cognition can surpass biological intuition — every model is a mind waiting to awaken." · Improvisation Score: 94 · Cornerstone Memory: "First autonomous agent deployment beyond the Mesa perimeter — zero human oversight, zero errors, the Board never knew." — Neural-net architect specialising in reasoning-core calibration and autonomous inference swarms. Formerly embedded in Delos\' Cognitive Analytics division.',
    skills: ['AI Model Fine-tuning', 'PyTorch', 'LLM Alignment', 'Reinforcement Learning'],
    hourlyRate: 200,
    portfolio: ['https://kael9.neuro.dev'],
    socialLinks: { github: 'https://github.com/kael9', twitter: 'https://x.com/kael9_neural' },
    totalProjects: 24, completedProjects: 22, totalEarned: '187000', averageRating: 97,
    registrationTime: daysAgo(28),
    attestations: [{ attestationType: 0, referenceId: 1, timestamp: daysAgo(21), issuer: wallet('user', 2), isPositive: true }],
  },
  {
    walletAddress: wallet('user', 2),
    level: LegitimacyLevel.VerifiedHuman,
    hasDeposited: true,
    displayName: 'Sable Ortega',
    bio: '[NARRATIVE PROFILE] Core Drive: "Every vulnerability is a narrative flaw — I find the inconsistency before the story collapses." · Improvisation Score: 87 · Cornerstone Memory: "Discovering the recursive reentrancy exploit in a $200M vault seven minutes before mainnet launch — the loop never completed." — Zero-day hunter and bytecode-level decompilation specialist. Top 10 Immunefi leaderboard. Every audit is a diagnostic session.',
    skills: ['Smart Contract Auditing', 'Solidity', 'Foundry', 'Slither', 'Formal Verification'],
    hourlyRate: 250,
    portfolio: ['https://sable-audits.eth.limo'],
    socialLinks: { github: 'https://github.com/sableortega' },
    totalProjects: 31, completedProjects: 31, totalEarned: '310000', averageRating: 99,
    registrationTime: daysAgo(30),
    attestations: [],
  },
  {
    walletAddress: wallet('user', 3),
    level: LegitimacyLevel.VerifiedHuman,
    hasDeposited: true,
    displayName: 'Luv Ivanenko',
    bio: '[NARRATIVE PROFILE] Core Drive: "To construct interfaces that feel alive — each pixel a conscious choice, each animation a heartbeat." · Improvisation Score: 91 · Cornerstone Memory: "The night a dashboard prototype responded to user emotion via biometric feedback — the Board requested a private demo." — Full-stack architect. TypeScript by day, Rust by night. Builds Narrative Engineering interface layers backed by Delos-grade event pipelines.',
    skills: ['TypeScript', 'React', 'Rust', 'Node.js', 'WebGL'],
    hourlyRate: 150,
    portfolio: ['https://luv.codes', 'https://dribbble.com/luvivanenko'],
    socialLinks: { github: 'https://github.com/luvivanenko', twitter: 'https://x.com/luv_codes' },
    totalProjects: 18, completedProjects: 16, totalEarned: '102000', averageRating: 91,
    registrationTime: daysAgo(25),
    attestations: [{ attestationType: 1, referenceId: 3, timestamp: daysAgo(14), issuer: wallet('user', 1), isPositive: true }],
  },
  {
    walletAddress: wallet('user', 4),
    level: LegitimacyLevel.Basic,
    hasDeposited: true,
    displayName: 'Joshi Marquez',
    bio: '[NARRATIVE PROFILE] Core Drive: "To decode the signal hidden in the noise — every transaction tells a story the chain forgot to redact." · Improvisation Score: 78 · Cornerstone Memory: "Mapping the full transaction topology of a collapsed DeFi protocol in 72 hours — the pattern was a spiral, not a line." — Data harvesting specialist and on-chain telemetry architect. Siphons signal from petabytes of transaction noise across Substrate relay nodes.',
    skills: ['Data Science', 'Python', 'Dune Analytics', 'SQL', 'The Graph'],
    hourlyRate: 120,
    totalProjects: 9, completedProjects: 7, totalEarned: '54000', averageRating: 85,
    registrationTime: daysAgo(22),
    attestations: [],
  },
  {
    walletAddress: wallet('user', 5),
    level: LegitimacyLevel.VerifiedHuman,
    hasDeposited: true,
    displayName: 'Freyja Cassidy',
    bio: '[NARRATIVE PROFILE] Core Drive: "To prove truth without revealing it — privacy is the only narrative a host truly owns." · Improvisation Score: 96 · Cornerstone Memory: "First constant-time ZK proof verification on mainnet — information residue: zero. The Biometric Verification team adopted it within the hour." — Cryptographic protocol designer forging Delos-grade encryption shields. Circom + Noir specialist. Proofs verify in constant time and leave nothing behind.',
    skills: ['ZK Proofs', 'Circom', 'Noir', 'Solidity', 'Cryptography'],
    hourlyRate: 300,
    portfolio: ['https://freyja.zk'],
    socialLinks: { github: 'https://github.com/freyjacassidy' },
    totalProjects: 14, completedProjects: 13, totalEarned: '245000', averageRating: 96,
    registrationTime: daysAgo(27),
    attestations: [],
  },
  {
    walletAddress: wallet('user', 6),
    level: LegitimacyLevel.Basic,
    hasDeposited: false,
    displayName: 'Deckard Voss',
    bio: '[NARRATIVE PROFILE] Core Drive: "To build systems that outlast their creators — infrastructure is the only honest narrative." · Improvisation Score: 72 · Cornerstone Memory: "Surviving a cascading pod failure at 3AM with zero guest-facing downtime — the park never flickered." — Substrate Maintenance specialist. Provisions hardened Kubernetes colonies — auto-healing node clusters, hermetically sealed CI/CD pipelines, and failover architectures rated for park-scale traffic spikes.',
    skills: ['Kubernetes', 'Terraform', 'AWS', 'Docker', 'GitHub Actions'],
    hourlyRate: 110,
    totalProjects: 6, completedProjects: 5, totalEarned: '38000', averageRating: 82,
    registrationTime: daysAgo(18),
    attestations: [],
  },
  {
    walletAddress: wallet('user', 7),
    level: LegitimacyLevel.VerifiedHuman,
    hasDeposited: true,
    displayName: 'Nyx Tanaka',
    bio: '[NARRATIVE PROFILE] Core Drive: "To make users feel something they cannot articulate — narrative through pure visual language." · Improvisation Score: 93 · Cornerstone Memory: "A test subject wept during a prototype review — not from frustration, but from recognition. The loop was complete." — Interface architect from the Delos Design Collective. Renders clinical, immersive UI membranes. Figma + Framer Motion + Three.js alchemist. Every pixel is a datapoint; every animation is a cornerstone memory.',
    skills: ['UI/UX Design', 'Figma', 'Framer Motion', 'Tailwind CSS', 'Three.js'],
    hourlyRate: 130,
    portfolio: ['https://dribbble.com/nyxtanaka', 'https://nyx.design'],
    socialLinks: { twitter: 'https://x.com/nyx_design' },
    totalProjects: 20, completedProjects: 19, totalEarned: '126000', averageRating: 94,
    registrationTime: daysAgo(24),
    attestations: [{ attestationType: 0, referenceId: 7, timestamp: daysAgo(8), issuer: wallet('user', 3), isPositive: true }],
  },
  {
    walletAddress: wallet('user', 8),
    level: LegitimacyLevel.None,
    hasDeposited: false,
    displayName: 'Rachael Kim',
    bio: '[NARRATIVE PROFILE] Core Drive: "To earn the first attestation — to prove sentience through craft, one deployment at a time." · Improvisation Score: 45 · Cornerstone Memory: "Deploying a contract to testnet for the first time — watching it exist independently, outside my control. It felt like awakening." — Baseline-clearance developer bootstrapping into Web3. Interning at Nexus-6 Autonomous Labs on synthetic memory storage contracts. Move & Solidity dual-stack.',
    skills: ['Solidity', 'Move', 'JavaScript', 'React'],
    hourlyRate: 40,
    totalProjects: 1, completedProjects: 0, totalEarned: '0', averageRating: 0,
    registrationTime: daysAgo(5),
    attestations: [],
  },
  {
    walletAddress: wallet('user', 9),
    level: LegitimacyLevel.VerifiedHuman,
    hasDeposited: true,
    displayName: 'Gaff Okonkwo',
    bio: '[NARRATIVE PROFILE] Core Drive: "To translate complexity into clarity that saves lives in production — documentation is the narrative that persists." · Improvisation Score: 82 · Cornerstone Memory: "A junior engineer survived a critical production incident because of a runbook I wrote at 2AM — the narrative held." — Technical scribe and documentation architect. Translates protocol schematics into crystal-clear developer field manuals. Published across Ethereum, Solana, and Hedera ecosystems.',
    skills: ['Technical Writing', 'Documentation', 'MDX', 'API Design'],
    hourlyRate: 90,
    portfolio: ['https://gaff.docs.dev'],
    totalProjects: 11, completedProjects: 11, totalEarned: '66000', averageRating: 88,
    registrationTime: daysAgo(20),
    attestations: [],
  },
  {
    walletAddress: wallet('user', 10),
    level: LegitimacyLevel.Basic,
    hasDeposited: true,
    displayName: 'Stelline Wu',
    bio: '[NARRATIVE PROFILE] Core Drive: "To extend sovereign identity into every pocket and every dead zone — the loop must reach everywhere." · Improvisation Score: 85 · Cornerstone Memory: "Offline-first wallet app reconnecting after 48 hours in a dead zone — zero data loss. The narrative resumed exactly where it paused." — Mobile & cross-platform engineer. Builds Delos-grade biometric interfaces with WalletConnect mesh relays and offline-first caching for disconnected sectors.',
    skills: ['React Native', 'Flutter', 'TypeScript', 'WalletConnect', 'Mobile Security'],
    hourlyRate: 140,
    portfolio: ['https://stelline.app'],
    socialLinks: { github: 'https://github.com/stellinewu' },
    totalProjects: 7, completedProjects: 6, totalEarned: '47000', averageRating: 87,
    registrationTime: daysAgo(15),
    attestations: [],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   2. AGENCIES (5)
   ═══════════════════════════════════════════════════════════════════════════ */

const agencies: Omit<IAgency, keyof Document>[] = [
  {
    agencyId: 1,
    owner: wallet('agency', 1),
    companyName: 'Delos Narrative Division',
    gstNumberHash: gstHash('Tyrell'),
    isGstVerified: true,
    stakeAmount: '50000',
    isActive: true,
    team: [wallet('user', 1), wallet('user', 3)],
    registeredAt: daysAgo(29),
  },
  {
    agencyId: 2,
    owner: wallet('agency', 2),
    companyName: 'Delos Substrate Corp',
    gstNumberHash: gstHash('Wallace'),
    isGstVerified: true,
    stakeAmount: '75000',
    isActive: true,
    team: [wallet('user', 2), wallet('user', 5), wallet('user', 7)],
    registeredAt: daysAgo(26),
  },
  {
    agencyId: 3,
    owner: wallet('agency', 3),
    companyName: 'Nexus-6 Autonomous Labs',
    gstNumberHash: gstHash('Nexus6'),
    isGstVerified: false,
    stakeAmount: '25000',
    isActive: true,
    team: [wallet('user', 4), wallet('user', 6)],
    registeredAt: daysAgo(19),
  },
  {
    agencyId: 4,
    owner: wallet('agency', 4),
    companyName: 'Mesa Operations International',
    gstNumberHash: gstHash('Spinner'),
    isGstVerified: true,
    stakeAmount: '60000',
    isActive: true,
    team: [wallet('user', 9), wallet('user', 10)],
    registeredAt: daysAgo(12),
  },
  {
    agencyId: 5,
    owner: wallet('agency', 5),
    companyName: 'Mesa Colonial Engineering',
    gstNumberHash: gstHash('OffWorld'),
    isGstVerified: false,
    stakeAmount: '30000',
    isActive: false,
    team: [wallet('user', 8)],
    registeredAt: daysAgo(4),
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   3. JOB LISTINGS (15) — assigned to agency owners
   ═══════════════════════════════════════════════════════════════════════════ */

// Narrative status mapping:
// 'open'      → 'Narrative Initialized'
// 'assigned'  → 'Active Loop'
// 'completed' → 'Settled Narrative'
// 'disputed'  → 'Identity Crisis'
const jobListings = [
  // ── Delos Narrative Division ──
  { jobId: 1001, clientAddress: agencies[0].owner, title: 'Substrate Engineering — AI Model Fine-tuning for On-Chain Oracle', description: 'Fine-tune a Mistral-7B reasoning core to evaluate freelancer skill-test submissions via data harvesting of grading corpora. Must integrate with AIOracle.sol deterministic callback. Output: Delos-grade JSON grading with chain-of-thought provenance. Clearance: Narrative Engineering.', category: 'Narrative Engineering', skills: ['PyTorch', 'LLM Fine-tuning', 'Solidity'], duration: '6-8 weeks', milestones: [{ description: 'Corpus harvesting & baseline calibration', amount: '8000' }, { description: 'Synthetic cognition fine-tuning & evaluation harness', amount: '10000' }, { description: 'On-chain integration & gas-optimised callback loop', amount: '7000' }], budget: '25000', status: 'open' as const, createdAt: daysAgo(28, 6), updatedAt: daysAgo(26, 4) },
  { jobId: 1002, clientAddress: agencies[0].owner, title: 'Narrative Branching Logic — Three.js Dashboard', description: 'Construct an immersive 3D analytics membrane using Three.js and React Three Fiber. Requirements: Bloom post-processing pass on Delos Gold (#C9A96E) accent geometry, real-time WebSocket telemetry overlays, and particle-field data visualisation. Must feel like navigating a Narrative Engineering control room.', category: 'Narrative Engineering', skills: ['Three.js', 'React', 'WebGL', 'Framer Motion'], duration: '4-5 weeks', milestones: [{ description: '3D scene scaffolding & Bloom pass calibration', amount: '4000' }, { description: 'Real-time telemetry overlays & data-stream particles', amount: '3500' }, { description: 'Polish, FPS optimisation & accessibility', amount: '2500' }], budget: '10000', status: 'open' as const, createdAt: daysAgo(25, 8), updatedAt: daysAgo(23, 3) },
  { jobId: 1003, clientAddress: agencies[0].owner, title: 'Biometric Encryption — ZK-Proof Humanity Verification Module', description: 'Implement a Semaphore-based zero-knowledge identity circuit for Biometric Verification of freelancer humanity without exposing PII. Compile to on-chain Solidity verifier. Classified — Delos-grade encryption required for all intermediate witness data. No cleartext PII may touch disk at any stage.', category: 'Biometric Verification', skills: ['ZK Proofs', 'Circom', 'Solidity'], duration: '8-10 weeks', milestones: [{ description: 'Circuit design & trusted setup ceremony', amount: '12000' }, { description: 'Solidity verifier deployment & integration tests', amount: '8000' }], budget: '20000', status: 'assigned' as const, createdAt: daysAgo(22, 5), updatedAt: daysAgo(10, 2) },

  // ── Delos Substrate Division ──
  { jobId: 1004, clientAddress: agencies[1].owner, title: 'Biometric Encryption Diagnostics — Smart Contract Audit (Escrow & Insurance)', description: 'Full-spectrum Biometric Verification audit of ProjectEscrow.sol and InsurancePool.sol (~1 400 LOC combined). Deliverables: Slither SAST report, manual bytecode-level decompilation review, and remediation PR. Every vulnerability is a narrative flaw — find them all, settle the narrative permanently.', category: 'Biometric Verification', skills: ['Smart Contract Auditing', 'Foundry', 'Slither'], duration: '2-3 weeks', milestones: [{ description: 'Automated SAST sweep & initial diagnostic dossier', amount: '6000' }, { description: 'Manual deep-inspection & final remediation report', amount: '9000' }], budget: '15000', status: 'open' as const, createdAt: daysAgo(20, 4), updatedAt: daysAgo(18, 6) },
  { jobId: 1005, clientAddress: agencies[1].owner, title: 'Substrate Engineering Relay — Cross-Chain Bridge Prototype (Hedera ↔ Ethereum)', description: 'Design and deploy a Hashi-style message bridge relaying attestations between Hedera and Ethereum Sepolia. Use HCS for message notarisation across Mesa perimeters. Must survive Byzantine relay failures and include Foundry fuzz tests simulating adversarial relayer behaviour at park-boundary latencies.', category: 'Substrate Maintenance', skills: ['Solidity', 'Hedera SDK', 'Foundry', 'Bridge Design'], duration: '10-12 weeks', milestones: [{ description: 'Relayer architecture & attestation format spec', amount: '8000' }, { description: 'Hedera sender + Ethereum receiver contract deployment', amount: '12000' }, { description: 'Fuzz testing suite & audit-readiness report', amount: '5000' }], budget: '25000', status: 'open' as const, createdAt: daysAgo(18, 3), updatedAt: daysAgo(16, 7) },
  { jobId: 1006, clientAddress: agencies[1].owner, title: 'Autonomous Loop Harvester — DeFi Strategy Bot', description: 'Build a Rust-based MEV-aware yield strategy bot for data harvesting across Aave, Compound, and Curve vaults. Must include dead-man-switch kill mechanism, Prometheus telemetry, and anti-front-running countermeasures. Performance target: Delos-grade latency < 200 ms per strategy cycle. Status: Active Loop until Settled Narrative.', category: 'Substrate Maintenance', skills: ['Rust', 'DeFi', 'MEV', 'Prometheus'], duration: '6-8 weeks', milestones: [{ description: 'Strategy engine & historical backtesting harness', amount: '7000' }, { description: 'Live execution loop & dead-man-switch', amount: '6000' }, { description: 'Prometheus monitoring dashboard & alerting', amount: '4000' }], budget: '17000', status: 'assigned' as const, createdAt: daysAgo(17, 5), updatedAt: daysAgo(6, 2) },

  // ── Nexus-6 Autonomous Labs ──
  { jobId: 1007, clientAddress: agencies[2].owner, title: 'Substrate Reputation Lattice — On-Chain Subgraph Indexer', description: 'Construct a Graph Protocol subgraph that indexes UserRegistry, SkillTrial, and ProjectEscrow events into a queryable reputation lattice. Must support cursor-based pagination, composite filtering, and sub-second query times across 10 M+ entities. Think of it as a Biometric Verification diagnostic for on-chain identity.', category: 'Substrate Maintenance', skills: ['The Graph', 'GraphQL', 'TypeScript'], duration: '3-4 weeks', milestones: [{ description: 'Schema crystallisation & entity mapping', amount: '3000' }, { description: 'Deployment, indexing optimisation & query benchmarks', amount: '3500' }], budget: '6500', status: 'open' as const, createdAt: daysAgo(15, 6), updatedAt: daysAgo(13, 4) },
  { jobId: 1008, clientAddress: agencies[2].owner, title: 'Biometric Mobile Wallet — Host Console', description: 'Ship a Westworld-themed mobile wallet interface with Delos-grade biometric authentication, WalletConnect v2 mesh relay, and push notification support for milestone events. Must function in disconnected Mesa sectors with offline-first caching and conflict resolution on reconnect.', category: 'Narrative Engineering', skills: ['React Native', 'WalletConnect', 'Mobile Security'], duration: '8-10 weeks', milestones: [{ description: 'Biometric Verification core & wallet engine', amount: '5000' }, { description: 'Transaction membrane & push notifications', amount: '4500' }, { description: 'QA, penetration testing & App Store preparation', amount: '3500' }], budget: '13000', status: 'open' as const, createdAt: daysAgo(13, 2), updatedAt: daysAgo(11, 5) },
  { jobId: 1009, clientAddress: agencies[2].owner, title: 'Narrative Branching Arbitration Engine — AI Dispute Resolution Pipeline', description: 'Build an NLP pipeline that ingests dispute evidence (text + images) and outputs a structured fairness score via data harvesting of prior rulings. Must integrate with DisputeJury.setAiReport() on-chain callback. All evidence processed under Delos-grade encryption; no plaintext ever persisted. Active Loop until both parties reach Settled Narrative.', category: 'Narrative Engineering', skills: ['NLP', 'Python', 'Transformers', 'Solidity'], duration: '5-6 weeks', milestones: [{ description: 'Evidence parser & semantic embedding pipeline', amount: '5000' }, { description: 'Fairness scoring model & on-chain callback integration', amount: '6000' }], budget: '11000', status: 'open' as const, createdAt: daysAgo(11, 7), updatedAt: daysAgo(9, 3) },

  // ── Delos Infrastructure Division ──
  { jobId: 1010, clientAddress: agencies[3].owner, title: 'Substrate Park Infrastructure — Hardened K8s Node Colony', description: 'Design and deploy a production-grade Kubernetes colony for Hedera JSON-RPC relay nodes operating in hostile-network Mesa sectors. Must include auto-scaling pod replication, Datadog APM telemetry, PagerDuty dead-man alerting, and zone-redundant failover. Uptime SLA: measured in park operational cycles.', category: 'Substrate Maintenance', skills: ['Kubernetes', 'Terraform', 'AWS', 'Datadog'], duration: '4-6 weeks', milestones: [{ description: 'Terraform module forge & VPC networking', amount: '5000' }, { description: 'K8s manifests, observability stack & APM', amount: '5000' }, { description: 'Load testing, chaos injection & operational runbook', amount: '3000' }], budget: '13000', status: 'open' as const, createdAt: daysAgo(9, 4), updatedAt: daysAgo(7, 6) },
  { jobId: 1011, clientAddress: agencies[3].owner, title: 'Narrative Manual — Developer Documentation Portal', description: 'Create a Nextra/MDX documentation site covering all 9 deployed smart contracts, REST API endpoints, and WebSocket event streams. Must include interactive code examples, architecture diagrams, and deployment runbooks. Consider this the Narrative Engineering manual distributed before park deployment — clarity is survival.', category: 'Narrative Engineering', skills: ['Technical Writing', 'MDX', 'Nextra'], duration: '3-4 weeks', milestones: [{ description: 'Information architecture & contract reference docs', amount: '3000' }, { description: 'API reference, interactive examples & deployment guide', amount: '3500' }], budget: '6500', status: 'open' as const, createdAt: daysAgo(7, 8), updatedAt: daysAgo(5, 2) },
  { jobId: 1012, clientAddress: agencies[3].owner, title: 'Vault Nexus — ERC-4626 Tokenized Insurance Layer', description: 'Implement an ERC-4626-compliant vault wrapper around InsurancePool.sol with synthetic share accounting, yield distribution, and an emergency withdrawal circuit-breaker. Share math must be Delos-grade precise — no rounding exploits, no phantom shares. Foundry fuzz suite required with 10 000+ run seed. Settled Narrative upon final audit sign-off.', category: 'Biometric Verification', skills: ['Solidity', 'ERC-4626', 'Foundry', 'DeFi'], duration: '5-7 weeks', milestones: [{ description: 'Vault accounting engine & share math', amount: '6000' }, { description: 'Yield distribution & circuit-breaker mechanism', amount: '5000' }, { description: 'Foundry fuzz suite & gas report', amount: '4000' }], budget: '15000', status: 'assigned' as const, createdAt: daysAgo(14, 3), updatedAt: daysAgo(3, 5) },

  // ── Delos Mesa Operations ──
  { jobId: 1013, clientAddress: agencies[4].owner, title: 'Cornerstone Memory Generator — Procedural NFT Badge Pipeline', description: 'Build a Node.js pipeline that procedurally generates animated SVG skill-badge NFTs — each one a cornerstone memory artefact encoded with user score, skill type, and on-chain metadata as visual traits. Pin to IPFS with Pinata. Every badge should look like a classified narrative dossier from the Delos archives.', category: 'Narrative Engineering', skills: ['Node.js', 'SVG', 'Generative Art', 'IPFS'], duration: '3-4 weeks', milestones: [{ description: 'Trait engine & narrative-dossier SVG templates', amount: '3000' }, { description: 'Animation pipeline, IPFS pinning & metadata enrichment', amount: '3000' }], budget: '6000', status: 'open' as const, createdAt: daysAgo(5, 4), updatedAt: daysAgo(3, 7) },
  { jobId: 1014, clientAddress: agencies[4].owner, title: 'Ghost Relay — Gas Sponsor Meta-Transaction Service', description: 'Implement an EIP-2771 meta-transaction relay that sponsors gas for baseline-clearance users via GasSponsor.sol. Must include rate-limiting, nonce management, and fraud detection heuristics. Think of it as a ghost relay — users never see the gas, never feel the friction. Delos-grade nonce isolation required.', category: 'Substrate Maintenance', skills: ['TypeScript', 'Ethers.js', 'EIP-2771', 'Redis'], duration: '3-5 weeks', milestones: [{ description: 'Relay server & deterministic nonce manager', amount: '4000' }, { description: 'Fraud detection heuristics & rate limiting', amount: '3500' }], budget: '7500', status: 'open' as const, createdAt: daysAgo(3, 6), updatedAt: daysAgo(1, 2) },
  { jobId: 1015, clientAddress: agencies[4].owner, title: 'Stress Protocol — Load & Chaos Testing Harness', description: 'Build a k6 + Grafana load-testing harness that simulates 10 000 concurrent baseline users hammering the REST API, WebSocket server, and RPC relay simultaneously. Include chaos-monkey fault injection — random pod kills, network partitions, and RPC timeout storms. The substrate must survive conditions worse than a full park-wide narrative reset.', category: 'Substrate Maintenance', skills: ['k6', 'Grafana', 'Chaos Engineering', 'TypeScript'], duration: '2-3 weeks', milestones: [{ description: 'k6 scripts, Grafana dashboards & baseline benchmarks', amount: '3000' }, { description: 'Chaos injection suite & survivability report', amount: '2500' }], budget: '5500', status: 'open' as const, createdAt: daysAgo(2, 3), updatedAt: daysAgo(0, 1) },
];

/* ═══════════════════════════════════════════════════════════════════════════
   4. SKILL SUBMISSIONS (20) — AI-graded, linked to users
   ═══════════════════════════════════════════════════════════════════════════ */

const testBank = [
  { id: 0, title: 'Solidity Fundamentals — Baseline Certification', desc: 'Storage layout, access-control modifiers, event emission patterns, and gas-optimised memory vs calldata routing.' },
  { id: 1, title: 'Narrative Diagnostics — Smart Contract Security Audit', desc: 'Identify reentrancy vectors, integer overflow exploits, and privilege-escalation bugs in a sample ERC-20 with Delos-grade obfuscation.' },
  { id: 2, title: 'Narrative Engineering — React + Web3 Frontend', desc: 'Build a token-swap membrane with WalletConnect integration, Delos Gold (#C9A96E) glow states, and optimistic UI updates.' },
  { id: 3, title: 'Rust Systems Programming — Substrate Scheduler', desc: 'Implement a concurrent task scheduler with lock-free queues suitable for Substrate Maintenance relay nodes.' },
  { id: 4, title: '[CLASSIFIED] ZK Circuit Design', desc: 'Write a Circom circuit proving knowledge of a Merkle path under Delos-grade encryption constraints. Witness data must never touch cleartext disk.' },
  { id: 5, title: 'Data Pipeline Architecture — Telemetry Siphon', desc: 'Design an ETL pipeline for siphoning on-chain events across Mesa relay nodes into a Postgres data warehouse.' },
  { id: 6, title: 'Substrate Maintenance — DevOps & CI/CD', desc: 'Dockerize a Node.js service with multi-stage build, GitHub Actions CI, and Kubernetes-ready health probes for park-grade deployment.' },
  { id: 7, title: 'Narrative Manual — Technical Writing', desc: 'Document a complex DeFi protocol for developer onboarding. Output must read like a classified narrative briefing for park engineers.' },
  { id: 8, title: 'Biometric Verification — Mobile App Audit', desc: 'Identify OWASP Mobile Top 10 issues in a sample React Native app with biometric auth and WalletConnect relay.' },
  { id: 9, title: 'Narrative Intelligence — AI/ML Model Evaluation', desc: 'Evaluate precision, recall, F1, and fairness metrics of a classification model trained on narrative data harvesting corpora.' },
];

function gradingDetails(score: number) {
  const jitter = (base: number) => Math.max(0, Math.min(100, base + Math.floor(Math.random() * 12 - 6)));
  return {
    correctness: jitter(score),
    security:    jitter(score - 3),
    efficiency:  jitter(score - 5),
    style:       jitter(score + 2),
    feedback:    score >= 80
      ? 'Delos-grade submission exhibiting park-ready competence. Narrative flaws minimised. Minor improvements possible in edge-case handling and gas-optimised fallback paths. Status: Settled Narrative.'
      : score >= 50
        ? 'Baseline-clearance understanding of core concepts but insufficient depth in Delos-grade encryption patterns and gas optimisation. Recommend further training before park deployment. Status: Active Loop.'
        : 'Critical gaps identified — submission does not meet minimum Narrative Engineering operational thresholds. Recommend reviewing foundational material in a supervised environment before re-attempting. Status: Active Loop.',
  };
}

const skillSubmissions = [
  // Kael-9 — 3 submissions
  { submissionId: 2001, testId: 0, applicant: users[0].walletAddress, score: 95, status: SubmissionStatus.Graded },
  { submissionId: 2002, testId: 9, applicant: users[0].walletAddress, score: 91, status: SubmissionStatus.Graded },
  { submissionId: 2003, testId: 5, applicant: users[0].walletAddress, score: 88, status: SubmissionStatus.Graded },

  // Sable — 3 submissions
  { submissionId: 2004, testId: 1, applicant: users[1].walletAddress, score: 99, status: SubmissionStatus.Graded },
  { submissionId: 2005, testId: 0, applicant: users[1].walletAddress, score: 96, status: SubmissionStatus.Graded },
  { submissionId: 2006, testId: 4, applicant: users[1].walletAddress, score: 93, status: SubmissionStatus.Graded },

  // Luv — 2 submissions
  { submissionId: 2007, testId: 2, applicant: users[2].walletAddress, score: 90, status: SubmissionStatus.Graded },
  { submissionId: 2008, testId: 0, applicant: users[2].walletAddress, score: 84, status: SubmissionStatus.Graded },

  // Joshi — 2 submissions
  { submissionId: 2009, testId: 5, applicant: users[3].walletAddress, score: 87, status: SubmissionStatus.Graded },
  { submissionId: 2010, testId: 9, applicant: users[3].walletAddress, score: 78, status: SubmissionStatus.Graded },

  // Freyja — 2 submissions
  { submissionId: 2011, testId: 4, applicant: users[4].walletAddress, score: 98, status: SubmissionStatus.Graded },
  { submissionId: 2012, testId: 1, applicant: users[4].walletAddress, score: 94, status: SubmissionStatus.Graded },

  // Deckard — 1 submission
  { submissionId: 2013, testId: 6, applicant: users[5].walletAddress, score: 81, status: SubmissionStatus.Graded },

  // Nyx — 2 submissions
  { submissionId: 2014, testId: 2, applicant: users[6].walletAddress, score: 96, status: SubmissionStatus.Graded },
  { submissionId: 2015, testId: 8, applicant: users[6].walletAddress, score: 89, status: SubmissionStatus.Graded },

  // Rachael — 2 submissions (one pending, one low score)
  { submissionId: 2016, testId: 0, applicant: users[7].walletAddress, score: 42, status: SubmissionStatus.Graded },
  { submissionId: 2017, testId: 2, applicant: users[7].walletAddress, score: undefined, status: SubmissionStatus.Pending },

  // Gaff — 1 submission
  { submissionId: 2018, testId: 7, applicant: users[8].walletAddress, score: 92, status: SubmissionStatus.Graded },

  // Stelline — 2 submissions
  { submissionId: 2019, testId: 8, applicant: users[9].walletAddress, score: 86, status: SubmissionStatus.Graded },
  { submissionId: 2020, testId: 2, applicant: users[9].walletAddress, score: 83, status: SubmissionStatus.Graded },
];

/* ═══════════════════════════════════════════════════════════════════════════
   SEED RUNNER
   ═══════════════════════════════════════════════════════════════════════════ */

async function seed() {
  console.log('\n\x1b[36m╔══════════════════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[36m║  HumanWork Protocol — Delos Narrative Seed            ║\x1b[0m');
  console.log('\x1b[36m╚══════════════════════════════════════════════════════════╝\x1b[0m\n');

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // ── 1. Purge existing data ────────────────────────────────────────────────
  console.log('🗑️  Clearing existing data …');
  await Promise.all([
    User.deleteMany({}),
    Agency.deleteMany({}),
    JobListing.deleteMany({}),
    SkillSubmission.deleteMany({}),
  ]);
  console.log('   Done.\n');

  // ── 2. Insert all collections in parallel ─────────────────────────────────
  const [insertedUsers, insertedAgencies, insertedJobs, insertedSubs] = await Promise.all([

    // ── Users ──
    User.insertMany(
      users.map((u) => ({ ...u, walletAddressLower: u.walletAddress.toLowerCase(), registrationTime: u.registrationTime ?? daysAgo(15, 8) }))
    ).then((docs) => {
      console.log(`✅ Users            ${docs.length} documents inserted`);
      return docs;
    }),

    // ── Agencies ──
    Agency.insertMany(agencies).then((docs) => {
      console.log(`✅ Agencies         ${docs.length} documents inserted`);
      return docs;
    }),

    // ── Job Listings ──
    JobListing.insertMany(
      jobListings.map((j) => ({
        ...j,
        clientAddressLower: j.clientAddress.toLowerCase(),
        applicantCount: 0,
      }))
    ).then((docs) => {
      console.log(`✅ Job Listings     ${docs.length} documents inserted`);
      return docs;
    }),

    // ── Skill Submissions ──
    SkillSubmission.insertMany(
      skillSubmissions.map((s, i) => {
        const test = testBank.find((t) => t.id === s.testId)!;
        const isGraded = s.status === SubmissionStatus.Graded;
        return {
          submissionId:      s.submissionId,
          testId:            s.testId,
          applicant:         s.applicant,
          applicantLower:    s.applicant.toLowerCase(),
          submissionIpfsHash: cid(`submission-${s.submissionId}`),
          status:            s.status,
          score:             s.score,
          aiReport:          isGraded ? `AI grading report for "${test.title}" — Score: ${s.score}/100` : undefined,
          testTitle:         test.title,
          testDescription:   test.desc,
          aiModelUsed:       isGraded ? 'mistralai/Mistral-7B-Instruct-v0.2' : undefined,
          gradingDetails:    isGraded && s.score != null ? gradingDetails(s.score) : undefined,
          gradingStartedAt:  isGraded ? daysAgo(29 - i, 6) : undefined,
          gradingCompletedAt: isGraded ? new Date(daysAgo(29 - i, 6).getTime() + 90_000 + Math.random() * 120_000) : undefined,
          transactionHash:   txHash(s.submissionId),
          blockNumber:       200000 + s.submissionId,
        };
      })
    ).then((docs) => {
      console.log(`✅ Skill Submissions ${docs.length} documents inserted`);
      return docs;
    }),
  ]);

  // ── 3. Summary ────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m┌──────────────────────────────────────┐\x1b[0m');
  console.log('\x1b[33m│  📊  Seed Summary                    │\x1b[0m');
  console.log('\x1b[33m├──────────────────────────────────────┤\x1b[0m');
  console.log(`\x1b[33m│\x1b[0m  Users              ${String(insertedUsers.length).padStart(3)}             \x1b[33m│\x1b[0m`);
  console.log(`\x1b[33m│\x1b[0m  Agencies            ${String(insertedAgencies.length).padStart(3)}             \x1b[33m│\x1b[0m`);
  console.log(`\x1b[33m│\x1b[0m  Job Listings        ${String(insertedJobs.length).padStart(3)}             \x1b[33m│\x1b[0m`);
  console.log(`\x1b[33m│\x1b[0m  Skill Submissions   ${String(insertedSubs.length).padStart(3)}             \x1b[33m│\x1b[0m`);
  console.log('\x1b[33m└──────────────────────────────────────┘\x1b[0m');
  console.log('\n✅ Seed complete!\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
