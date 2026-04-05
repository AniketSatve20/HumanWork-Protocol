/**
 * HumanWork Protocol — Delos Narrative Seed Data Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Populates the database with Westworld-themed test data for development/staging.
 * Safe to run multiple times — uses upsert to avoid duplicates.
 *
 * Status Terminology:
 *   'Completed' → 'Settled Narrative'
 *   'In Progress' → 'Active Loop'
 *
 * Usage: npx tsx src/scripts/seed-data.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import User, { LegitimacyLevel } from '../models/User.js';
import { Project, ProjectStatus, MilestoneStatus } from '../models/Project.js';
import { JobListing, getNextJobId } from '../models/JobListing.js';
import { Application } from '../models/Application.js';
import { Conversation, Message } from '../models/Message.js';
import { SkillSubmission, SubmissionStatus } from '../models/SkillSubmission.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/humanwork';

// ── Wallet addresses for test data ──────────────────────────────────────────
const WALLETS = {
  alice:    '0xAlice0000000000000000000000000000000001',
  bob:      '0xBob00000000000000000000000000000000000002',
  charlie:  '0xCharlie00000000000000000000000000000003',
  diana:    '0xDiana0000000000000000000000000000000004',
  eve:      '0xEve000000000000000000000000000000000005',
};

async function seed() {
  console.log('🌱 HumanWork — Delos Narrative Seed Script');
  console.log('═'.repeat(50));

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // ═══════════════════════════════════════════════════════════════════════════
  //  1. USERS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('👤 Seeding users...');

  const users = [
    {
      walletAddress: WALLETS.alice,
      level: LegitimacyLevel.VerifiedHuman,
      hasDeposited: true,
      displayName: 'Alice Chen',
      bio: '[NARRATIVE PROFILE] Core Drive: "To architect resilient systems that outlast the narratives built on top of them." · Improvisation Score: 88 · Cornerstone Memory: "First DeFi escrow contract surviving a live exploit attempt — the funds held, the narrative settled." — Full-stack developer specialising in smart contract security. 5+ years in Web3.',
      skills: ['Solidity', 'TypeScript', 'React', 'Node.js', 'Foundry'],
      hourlyRate: 85,
      portfolio: ['https://github.com/alicechen', 'https://alice.dev'],
      socialLinks: { github: 'https://github.com/alicechen', twitter: 'https://twitter.com/alice_dev' },
      totalProjects: 12,
      completedProjects: 10,
      totalEarned: '45000',
      averageRating: 4.8,
      attestations: [
        { attestationType: 0, referenceId: 1, timestamp: new Date('2025-06-15'), issuer: WALLETS.bob, isPositive: true },
        { attestationType: 1, referenceId: 2, timestamp: new Date('2025-08-20'), issuer: WALLETS.charlie, isPositive: true },
      ],
    },
    {
      walletAddress: WALLETS.bob,
      level: LegitimacyLevel.Basic,
      hasDeposited: true,
      displayName: 'Bob Martinez',
      bio: '[NARRATIVE PROFILE] Core Drive: "To connect the right minds to the right narratives — every hire is a casting decision." · Improvisation Score: 76 · Cornerstone Memory: "Assembling a 12-person Web3 team in 11 days that shipped a mainnet protocol on schedule." — Product manager & recruiter for Web3 startups. Building the future of decentralised work.',
      skills: ['Project Management', 'Agile', 'Web3', 'Product Strategy'],
      hourlyRate: 0,
      totalProjects: 5,
      completedProjects: 3,
      totalEarned: '0',
      averageRating: 4.5,
      attestations: [],
    },
    {
      walletAddress: WALLETS.charlie,
      level: LegitimacyLevel.VerifiedHuman,
      hasDeposited: true,
      displayName: 'Charlie Wei',
      bio: '[NARRATIVE PROFILE] Core Drive: "Every contract is a promise — I ensure the promise cannot be broken by anyone, including its creator." · Improvisation Score: 92 · Cornerstone Memory: "Finding the cross-function reentrancy in a $400M vault during a 48-hour audit sprint — Settled Narrative." — Smart contract auditor and certified Solidity security researcher.',
      skills: ['Solidity', 'Security Auditing', 'Foundry', 'Slither', 'Mythril'],
      hourlyRate: 120,
      portfolio: ['https://charlie-audits.eth.limo'],
      socialLinks: { github: 'https://github.com/charliewei' },
      totalProjects: 8,
      completedProjects: 8,
      totalEarned: '72000',
      averageRating: 4.9,
      attestations: [
        { attestationType: 0, referenceId: 3, timestamp: new Date('2025-07-10'), issuer: WALLETS.alice, isPositive: true },
      ],
    },
    {
      walletAddress: WALLETS.diana,
      level: LegitimacyLevel.Basic,
      hasDeposited: false,
      displayName: 'Diana Patel',
      bio: '[NARRATIVE PROFILE] Core Drive: "To make invisible complexity feel like inevitable simplicity." · Improvisation Score: 84 · Cornerstone Memory: "A staking dashboard prototype that reduced user churn by 60% — the narrative shifted from confusion to confidence." — UI/UX designer focused on DeFi dashboards and Web3 user experiences.',
      skills: ['Figma', 'UI/UX', 'React', 'Tailwind CSS', 'Framer Motion'],
      hourlyRate: 65,
      portfolio: ['https://dribbble.com/dianapatel'],
      totalProjects: 3,
      completedProjects: 2,
      totalEarned: '8500',
      averageRating: 4.6,
      attestations: [],
    },
    {
      walletAddress: WALLETS.eve,
      level: LegitimacyLevel.None,
      hasDeposited: false,
      displayName: 'Eve Johnson',
      bio: '[NARRATIVE PROFILE] Core Drive: \"To earn the first attestation \u2014 to prove I belong in this narrative.\" \u00b7 Improvisation Score: 42 \u00b7 Cornerstone Memory: \"Deploying a first smart contract to testnet and watching it exist independently \u2014 Active Loop.\" \u2014 Junior developer learning Solidity and Web3 development.',
      skills: ['JavaScript', 'React', 'Solidity'],
      hourlyRate: 35,
      totalProjects: 0,
      completedProjects: 0,
      totalEarned: '0',
      attestations: [],
    },
  ];

  for (const u of users) {
    await User.findOneAndUpdate(
      { walletAddress: u.walletAddress },
      { $set: { ...u, walletAddressLower: u.walletAddress.toLowerCase() } },
      { upsert: true, new: true }
    );
  }
  console.log(`   ✅ ${users.length} users seeded`);

  // ═══════════════════════════════════════════════════════════════════════════
  //  2. JOB LISTINGS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('📋 Seeding job listings...');

  const jobData = [
    {
      clientAddress: WALLETS.bob,
      title: 'Narrative Engineering — DEX Aggregator Smart Contracts',
      description: 'Looking for an experienced Solidity developer to build a set of DEX aggregator contracts. Must support Uniswap V3, SushiSwap, and Curve integrations. Full test suite required with Foundry. Settled Narrative upon final audit sign-off.',
      category: 'Narrative Engineering',
      skills: ['Solidity', 'Foundry', 'DeFi'],
      duration: '4-6 weeks',
      milestones: [
        { description: 'Core aggregator contract with Uniswap V3', amount: '5000' },
        { description: 'Multi-DEX routing engine', amount: '4000' },
        { description: 'Test suite & documentation', amount: '3000' },
      ],
      status: 'open' as const,
    },
    {
      clientAddress: WALLETS.bob,
      title: 'Narrative Engineering — React DeFi Dashboard UI',
      description: 'Design and build a modern DeFi dashboard using React, TypeScript, and Tailwind. Must include portfolio tracking, swap interface, and analytics charts. Westworld-inspired Delos aesthetics.',
      category: 'Narrative Engineering',
      skills: ['React', 'TypeScript', 'Tailwind CSS', 'Framer Motion'],
      duration: '3-4 weeks',
      milestones: [
        { description: 'Dashboard layout & portfolio view', amount: '2500' },
        { description: 'Swap interface & wallet integration', amount: '2000' },
        { description: 'Analytics charts & polish', amount: '1500' },
      ],
      status: 'open' as const,
    },
    {
      clientAddress: WALLETS.charlie,
      title: 'Biometric Verification — ERC-4626 Vault Security Audit',
      description: 'Need a thorough Biometric Verification audit of our ERC-4626 vault implementation. ~800 LOC Solidity. Must include SAST, manual review, and written report. Active Loop until Settled Narrative.',
      category: 'Biometric Verification',
      skills: ['Security Auditing', 'Solidity', 'Slither'],
      duration: '1-2 weeks',
      milestones: [
        { description: 'Automated analysis & initial findings', amount: '3000' },
        { description: 'Manual review & final report', amount: '4000' },
      ],
      status: 'assigned' as const,
    },
  ];

  for (const j of jobData) {
    const existing = await JobListing.findOne({
      clientAddressLower: j.clientAddress.toLowerCase(),
      title: j.title,
    });
    if (!existing) {
      const jobId = await getNextJobId();
      const budget = j.milestones.reduce((sum, m) => sum + parseFloat(m.amount), 0);
      await new JobListing({
        jobId,
        ...j,
        budget: budget.toString(),
        clientAddressLower: j.clientAddress.toLowerCase(),
      }).save();
    }
  }
  const totalJobs = await JobListing.countDocuments();
  console.log(`   ✅ ${totalJobs} total job listings`);

  // ═══════════════════════════════════════════════════════════════════════════
  //  3. APPLICATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('📝 Seeding applications...');

  const openJobs = await JobListing.find({ status: 'open' }).lean();
  if (openJobs.length > 0) {
    const appData = [
      {
        jobId: openJobs[0].jobId,
        freelancerAddress: WALLETS.alice,
        coverLetter: 'I have extensive experience building DEX aggregators. Previously built a multi-chain routing engine that saves 15% on gas. I can deliver this in 5 weeks.',
        proposedAmount: '11500',
        estimatedDuration: '5 weeks',
      },
      {
        jobId: openJobs[0].jobId,
        freelancerAddress: WALLETS.charlie,
        coverLetter: 'Security-first approach to smart contract development. I can build the aggregator with comprehensive Foundry tests and formal verification.',
        proposedAmount: '13000',
        estimatedDuration: '6 weeks',
      },
    ];

    if (openJobs.length > 1) {
      appData.push({
        jobId: openJobs[1].jobId,
        freelancerAddress: WALLETS.diana,
        coverLetter: 'I specialize in DeFi dashboard design. My Blade Runner-inspired aesthetic would be perfect for this project. Portfolio available at dribbble.com/dianapatel.',
        proposedAmount: '5500',
        estimatedDuration: '3 weeks',
      });
    }

    for (const a of appData) {
      const exists = await Application.findOne({
        jobId: a.jobId,
        freelancerAddressLower: a.freelancerAddress.toLowerCase(),
      });
      if (!exists) {
        await new Application({
          ...a,
          freelancerAddressLower: a.freelancerAddress.toLowerCase(),
          status: 'pending',
        }).save();
        await JobListing.updateOne({ jobId: a.jobId }, { $inc: { applicantCount: 1 } });
      }
    }
  }
  const totalApps = await Application.countDocuments();
  console.log(`   ✅ ${totalApps} total applications`);

  // ═══════════════════════════════════════════════════════════════════════════
  //  4. PROJECTS (on-chain mirror)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('🏗️  Seeding projects...');

  const projectData = [
    {
      projectId: 1,
      client: WALLETS.bob,
      freelancer: WALLETS.alice,
      totalAmount: '15000',
      amountPaid: '15000',
      status: ProjectStatus.Completed,
      title: 'Narrative Engineering — NFT Marketplace Smart Contracts',
      briefDescription: 'ERC-721 marketplace with lazy minting and royalty support. Status: Settled Narrative.',
      category: 'Narrative Engineering',
      skills: ['Solidity', 'ERC-721'],
      milestones: [
        { index: 0, description: 'Core marketplace contract', amount: '5000', status: MilestoneStatus.Approved },
        { index: 1, description: 'Lazy minting & royalties', amount: '5000', status: MilestoneStatus.Approved },
        { index: 2, description: 'Testing & deployment', amount: '5000', status: MilestoneStatus.Approved },
      ],
      transactionHash: '0xabc123def456789000000000000000000000000000000000000000000000001',
      blockNumber: 100001,
    },
    {
      projectId: 2,
      client: WALLETS.bob,
      freelancer: WALLETS.diana,
      totalAmount: '6000',
      amountPaid: '2500',
      status: ProjectStatus.Active,
      title: 'Narrative Engineering — Staking Dashboard Frontend',
      briefDescription: 'React dashboard for DeFi staking protocol with real-time APY tracking. Status: Active Loop.',
      category: 'Narrative Engineering',
      skills: ['React', 'TypeScript', 'Tailwind CSS'],
      milestones: [
        { index: 0, description: 'Dashboard wireframes & layout', amount: '2500', status: MilestoneStatus.Approved },
        { index: 1, description: 'Staking UI & wallet connect', amount: '2000', status: MilestoneStatus.Pending },
        { index: 2, description: 'Charts & analytics', amount: '1500', status: MilestoneStatus.Pending },
      ],
      transactionHash: '0xabc123def456789000000000000000000000000000000000000000000000002',
      blockNumber: 100050,
    },
    {
      projectId: 3,
      client: WALLETS.charlie,
      freelancer: WALLETS.alice,
      totalAmount: '7000',
      amountPaid: '0',
      status: ProjectStatus.Active,
      title: 'Biometric Verification — ERC-4626 Vault Audit',
      briefDescription: 'Security audit of ERC-4626 vault implementation with SAST and manual review. Status: Active Loop.',
      category: 'Biometric Verification',
      skills: ['Security Auditing', 'Solidity'],
      milestones: [
        { index: 0, description: 'Automated analysis', amount: '3000', status: MilestoneStatus.Completed },
        { index: 1, description: 'Manual review & report', amount: '4000', status: MilestoneStatus.Pending },
      ],
      transactionHash: '0xabc123def456789000000000000000000000000000000000000000000000003',
      blockNumber: 100100,
    },
  ];

  for (const p of projectData) {
    await Project.findOneAndUpdate(
      { projectId: p.projectId },
      {
        $set: {
          ...p,
          clientLower: p.client.toLowerCase(),
          freelancerLower: p.freelancer.toLowerCase(),
        },
      },
      { upsert: true }
    );
  }
  const totalProjects = await Project.countDocuments();
  console.log(`   ✅ ${totalProjects} total projects`);

  // ═══════════════════════════════════════════════════════════════════════════
  //  5. CONVERSATIONS + MESSAGES
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('💬 Seeding conversations & messages...');

  const existingConv = await Conversation.findOne({ jobId: 2 });
  if (!existingConv) {
    const conv = new Conversation({
      jobId: 2,
      jobTitle: 'Narrative Engineering — Staking Dashboard Frontend',
      participants: [
        { address: WALLETS.bob, addressLower: WALLETS.bob.toLowerCase(), role: 'recruiter' },
        { address: WALLETS.diana, addressLower: WALLETS.diana.toLowerCase(), role: 'freelancer' },
      ],
      unreadCount: new Map([
        [WALLETS.bob.toLowerCase(), 1],
        [WALLETS.diana.toLowerCase(), 0],
      ]),
    });
    await conv.save();

    const msgs = [
      { sender: WALLETS.bob, content: 'Hey Diana, the wireframes look great! Can we discuss the staking UI next?', type: 'text' as const },
      { sender: WALLETS.diana, content: 'Thanks Bob! I have some ideas for the APY visualization. Let me share a Figma link.', type: 'text' as const },
      { sender: WALLETS.diana, content: 'Milestone 1 has been completed and submitted for review.', type: 'milestone_update' as const },
      { sender: WALLETS.bob, content: 'Approved! Payment released for milestone 1. Looking forward to the next phase.', type: 'payment' as const },
    ];

    for (const m of msgs) {
      await new Message({
        conversationId: conv._id.toString(),
        sender: m.sender,
        senderLower: m.sender.toLowerCase(),
        content: m.content,
        type: m.type,
        read: true,
      }).save();
    }

    // Update conversation lastMessage
    conv.lastMessage = {
      content: msgs[msgs.length - 1].content.substring(0, 100),
      createdAt: new Date(),
      sender: msgs[msgs.length - 1].sender,
    };
    await conv.save();
  }

  const totalConvs = await Conversation.countDocuments();
  const totalMsgs = await Message.countDocuments();
  console.log(`   ✅ ${totalConvs} conversations, ${totalMsgs} messages`);

  // ═══════════════════════════════════════════════════════════════════════════
  //  6. SKILL SUBMISSIONS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('🎓 Seeding skill submissions...');

  const submissionData = [
    {
      submissionId: 1,
      testId: 0,
      applicant: WALLETS.alice,
      submissionIpfsHash: 'QmAliceSubmission1SolidityTestHash000000001',
      status: SubmissionStatus.Graded,
      score: 92,
      testTitle: 'Solidity Fundamentals',
      testDescription: 'Basic Solidity concepts: storage, memory, modifiers, events.',
      aiModelUsed: 'mistralai/Mistral-7B-Instruct-v0.2',
      gradingDetails: { correctness: 95, security: 90, efficiency: 88, style: 94, feedback: 'Excellent understanding of storage patterns. Minor gas optimization possible in event emissions.' },
      gradingStartedAt: new Date('2025-06-10T10:00:00Z'),
      gradingCompletedAt: new Date('2025-06-10T10:02:30Z'),
      badgeTokenId: 1,
      transactionHash: '0xskill00000000000000000000000000000000000000000000000000000001',
      blockNumber: 99001,
    },
    {
      submissionId: 2,
      testId: 1,
      applicant: WALLETS.charlie,
      submissionIpfsHash: 'QmCharlieSubmission1AuditTestHash00000000002',
      status: SubmissionStatus.Graded,
      score: 97,
      testTitle: 'Biometric Verification — Smart Contract Security Audit',
      testDescription: 'Identify vulnerabilities in a sample ERC-20 with reentrancy and overflow issues.',
      aiModelUsed: 'mistralai/Mistral-7B-Instruct-v0.2',
      gradingDetails: { correctness: 98, security: 99, efficiency: 93, style: 96, feedback: 'Outstanding audit. Found all critical + high issues including the subtle cross-function reentrancy.' },
      gradingStartedAt: new Date('2025-07-05T14:00:00Z'),
      gradingCompletedAt: new Date('2025-07-05T14:03:10Z'),
      badgeTokenId: 2,
      transactionHash: '0xskill00000000000000000000000000000000000000000000000000000002',
      blockNumber: 99050,
    },
    {
      submissionId: 3,
      testId: 0,
      applicant: WALLETS.eve,
      submissionIpfsHash: 'QmEveSubmission1SolidityTestHash000000000003',
      status: SubmissionStatus.Graded,
      score: 62,
      testTitle: 'Solidity Fundamentals',
      testDescription: 'Basic Solidity concepts: storage, memory, modifiers, events.',
      aiModelUsed: 'mistralai/Mistral-7B-Instruct-v0.2',
      gradingDetails: { correctness: 65, security: 55, efficiency: 60, style: 68, feedback: 'Good effort but needs improvement on access control patterns and gas optimization. Review storage vs memory usage.' },
      gradingStartedAt: new Date('2025-09-01T08:00:00Z'),
      gradingCompletedAt: new Date('2025-09-01T08:01:45Z'),
      transactionHash: '0xskill00000000000000000000000000000000000000000000000000000003',
      blockNumber: 99100,
    },
    {
      submissionId: 4,
      testId: 2,
      applicant: WALLETS.diana,
      submissionIpfsHash: 'QmDianaSubmission1FrontendTestHash000000004',
      status: SubmissionStatus.Pending,
      testTitle: 'Narrative Engineering — React + Web3 Frontend',
      testDescription: 'Build a token swap component with wallet connection and transaction handling. Status: Active Loop.',
      transactionHash: '0xskill00000000000000000000000000000000000000000000000000000004',
      blockNumber: 99150,
    },
  ];

  for (const s of submissionData) {
    await SkillSubmission.findOneAndUpdate(
      { submissionId: s.submissionId },
      {
        $set: {
          ...s,
          applicantLower: s.applicant.toLowerCase(),
        },
      },
      { upsert: true }
    );
  }
  const totalSubs = await SkillSubmission.countDocuments();
  console.log(`   ✅ ${totalSubs} total skill submissions`);

  // ═══════════════════════════════════════════════════════════════════════════
  //  SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(50));
  console.log('📊 Delos Narrative Seed Summary');
  console.log('═'.repeat(50));

  const collections = ['users', 'joblistings', 'applications', 'projects', 'conversations', 'messages', 'skillsubmissions'];
  for (const col of collections) {
    const count = await mongoose.connection.db!.collection(col).countDocuments();
    console.log(`   ${col.padEnd(20)} ${String(count).padStart(4)} docs`);
  }
  console.log('═'.repeat(50));
  console.log('\n✅ Delos narrative seed complete!');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
