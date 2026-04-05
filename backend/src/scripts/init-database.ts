/**
 * HumanWork Protocol — Database Initialization Script
 * 
 * Creates all collections with proper schema validators, indexes, and seed data.
 * Safe to run multiple times (idempotent).
 * 
 * Usage: npx tsx src/scripts/init-database.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/humanwork';

// ============ Collection Definitions ============

interface CollectionDef {
  name: string;
  validator?: object;
  indexes: Array<{ keys: Record<string, number | string>; options?: Record<string, any> }>;
}

const collections: CollectionDef[] = [
  // ── Users ──
  {
    name: 'users',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['walletAddress'],
        properties: {
          walletAddress: { bsonType: 'string', description: 'Ethereum/Hedera wallet address' },
          walletAddressLower: { bsonType: 'string' },
          level: { bsonType: 'int', enum: [0, 1, 2], description: '0=None, 1=Basic, 2=VerifiedHuman' },
          hasDeposited: { bsonType: 'bool' },
          registrationTime: { bsonType: 'date' },
          ensName: { bsonType: 'string' },
          displayName: { bsonType: 'string' },
          bio: { bsonType: 'string' },
          avatarIpfsHash: { bsonType: 'string' },
          skills: { bsonType: 'array', items: { bsonType: 'string' } },
          hourlyRate: { bsonType: 'number' },
          portfolio: { bsonType: 'array', items: { bsonType: 'string' } },
          socialLinks: {
            bsonType: 'object',
            properties: {
              github: { bsonType: 'string' },
              linkedin: { bsonType: 'string' },
              twitter: { bsonType: 'string' },
              website: { bsonType: 'string' },
            },
          },
          attestations: { bsonType: 'array' },
          totalProjects: { bsonType: 'int' },
          completedProjects: { bsonType: 'int' },
          totalEarned: { bsonType: 'string' },
          averageRating: { bsonType: 'number' },
          lastSyncedBlock: { bsonType: 'int' },
        },
      },
    },
    indexes: [
      { keys: { walletAddress: 1 }, options: { unique: true } as any },
      { keys: { walletAddressLower: 1 } },
      { keys: { ensName: 1 } },
      { keys: { skills: 1, level: 1 } },
      { keys: { displayName: 'text' } },
    ],
  },

  // ── Nonces (auth — TTL auto-cleanup) ──
  {
    name: 'nonces',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['address', 'nonce', 'message', 'expiresAt'],
        properties: {
          address: { bsonType: 'string', description: 'Wallet address requesting auth' },
          nonce: { bsonType: 'string' },
          message: { bsonType: 'string' },
          expiresAt: { bsonType: 'date' },
        },
      },
    },
    indexes: [
      { keys: { address: 1 }, options: { unique: true } as any },
      { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } as any },
    ],
  },

  // ── Secure Users (encrypted PII — KYC data) ──
  {
    name: 'secureusers',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['walletAddress'],
        properties: {
          walletAddress: { bsonType: 'string' },
          walletAddressLower: { bsonType: 'string' },
          publicAlias: { bsonType: 'string' },
          role: { bsonType: 'string', enum: ['freelancer', 'recruiter', 'admin'] },
          isKycVerified: { bsonType: 'bool' },
          registrationDate: { bsonType: 'date' },
          legalName: { bsonType: 'string' },
          email: { bsonType: 'string' },
          phone: { bsonType: 'string' },
          taxId: { bsonType: 'string' },
          nationalId: { bsonType: 'string' },
          emailHash: { bsonType: 'string' },
          phoneHash: { bsonType: 'string' },
          consentGiven: { bsonType: 'bool' },
          deletionRequested: { bsonType: 'bool' },
        },
      },
    },
    indexes: [
      { keys: { walletAddress: 1 }, options: { unique: true } as any },
      { keys: { walletAddressLower: 1 } },
      { keys: { role: 1 } },
      { keys: { emailHash: 1 } },
      { keys: { phoneHash: 1 } },
      { keys: { isKycVerified: 1 } },
      { keys: { dataRetentionExpiry: 1 }, options: { expireAfterSeconds: 0, partialFilterExpression: { deletionRequested: true } } as any },
    ],
  },

  // ── Job Listings ──
  {
    name: 'joblistings',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['jobId', 'clientAddress', 'title', 'description', 'budget'],
        properties: {
          jobId: { bsonType: 'int', description: 'Auto-incrementing job ID' },
          clientAddress: { bsonType: 'string' },
          clientAddressLower: { bsonType: 'string' },
          title: { bsonType: 'string' },
          description: { bsonType: 'string' },
          category: { bsonType: 'string' },
          skills: { bsonType: 'array', items: { bsonType: 'string' } },
          duration: { bsonType: 'string' },
          milestones: { bsonType: 'array' },
          budget: { bsonType: 'string' },
          status: { bsonType: 'string', enum: ['open', 'assigned', 'closed'] },
          applicantCount: { bsonType: 'int' },
          assignedFreelancerAddress: { bsonType: 'string' },
          onChainProjectId: { bsonType: 'int' },
          ipfsHash: { bsonType: 'string' },
        },
      },
    },
    indexes: [
      { keys: { jobId: 1 }, options: { unique: true } as any },
      { keys: { clientAddress: 1 } },
      { keys: { clientAddressLower: 1, status: 1 } },
      { keys: { category: 1 } },
      { keys: { status: 1 } },
      { keys: { createdAt: -1 } },
    ],
  },

  // ── Applications (job applications from freelancers) ──
  {
    name: 'applications',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['jobId', 'freelancerAddress', 'coverLetter', 'proposedAmount', 'estimatedDuration'],
        properties: {
          jobId: { bsonType: 'int' },
          freelancerAddress: { bsonType: 'string' },
          freelancerAddressLower: { bsonType: 'string' },
          coverLetter: { bsonType: 'string' },
          proposedAmount: { bsonType: 'string' },
          estimatedDuration: { bsonType: 'string' },
          status: { bsonType: 'string', enum: ['pending', 'accepted', 'rejected'] },
        },
      },
    },
    indexes: [
      { keys: { jobId: 1, freelancerAddressLower: 1 }, options: { unique: true } as any },
      { keys: { jobId: 1, status: 1 } },
      { keys: { freelancerAddressLower: 1 } },
    ],
  },

  // ── Projects (on-chain escrow mirrors) ──
  {
    name: 'projects',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['projectId', 'client', 'totalAmount', 'title', 'briefDescription', 'transactionHash', 'blockNumber'],
        properties: {
          projectId: { bsonType: 'int', description: 'On-chain project ID' },
          client: { bsonType: 'string' },
          freelancer: { bsonType: 'string' },
          clientLower: { bsonType: 'string' },
          freelancerLower: { bsonType: 'string' },
          agencyId: { bsonType: 'int' },
          totalAmount: {
            bsonType: 'string',
            pattern: '^(0|[1-9][0-9]*)$',
            description: 'Canonical base-unit integer string'
          },
          amountPaid: {
            bsonType: 'string',
            pattern: '^(0|[1-9][0-9]*)$',
            description: 'Canonical base-unit integer string'
          },
          status: { bsonType: 'int', enum: [0, 1, 2, 3], description: '0=Open,1=Active,2=Completed,3=Cancelled' },
          milestones: { bsonType: 'array' },
          isEnterpriseProject: { bsonType: 'bool' },
          title: { bsonType: 'string' },
          briefDescription: { bsonType: 'string' },
          fullDescriptionIpfsHash: { bsonType: 'string' },
          category: { bsonType: 'string' },
          skills: { bsonType: 'array', items: { bsonType: 'string' } },
          deadline: { bsonType: 'date' },
          transactionHash: { bsonType: 'string' },
          blockNumber: { bsonType: 'int' },
        },
      },
    },
    indexes: [
      { keys: { projectId: 1 }, options: { unique: true } as any },
      { keys: { client: 1 } },
      { keys: { freelancer: 1 } },
      { keys: { clientLower: 1, status: 1 } },
      { keys: { freelancerLower: 1, status: 1 } },
      { keys: { status: 1 } },
      { keys: { category: 1 } },
      { keys: { transactionHash: 1 } },
      { keys: { blockNumber: -1 } },
      { keys: { createdAt: -1 } },
      { keys: { title: 'text' } },
    ],
  },

  // ── Skill Submissions (AI-graded trial results) ──
  {
    name: 'skillsubmissions',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['submissionId', 'testId', 'applicant', 'submissionIpfsHash', 'transactionHash', 'blockNumber'],
        properties: {
          submissionId: { bsonType: 'int' },
          testId: { bsonType: 'int' },
          applicant: { bsonType: 'string' },
          applicantLower: { bsonType: 'string' },
          submissionIpfsHash: { bsonType: 'string' },
          status: { bsonType: 'int', enum: [0, 1, 2, 3], description: '0=Pending,1=Grading,2=Graded,3=Failed' },
          score: { bsonType: 'int' },
          aiReport: { bsonType: 'string' },
          testTitle: { bsonType: 'string' },
          testDescription: { bsonType: 'string' },
          testFee: { bsonType: 'string' },
          transactionHash: { bsonType: 'string' },
          blockNumber: { bsonType: 'int' },
          badgeTokenId: { bsonType: 'int' },
        },
      },
    },
    indexes: [
      { keys: { submissionId: 1 }, options: { unique: true } as any },
      { keys: { testId: 1 } },
      { keys: { applicant: 1 } },
      { keys: { applicantLower: 1, status: 1 } },
      { keys: { testId: 1, status: 1 } },
      { keys: { status: 1 } },
      { keys: { transactionHash: 1 } },
      { keys: { blockNumber: -1 } },
    ],
  },

  // ── Conversations (messaging threads) ──
  {
    name: 'conversations',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['jobId', 'jobTitle', 'participants'],
        properties: {
          jobId: { bsonType: 'int' },
          jobTitle: { bsonType: 'string' },
          participants: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              required: ['address', 'addressLower', 'role'],
              properties: {
                address: { bsonType: 'string' },
                addressLower: { bsonType: 'string' },
                name: { bsonType: 'string' },
                avatar: { bsonType: 'string' },
                role: { bsonType: 'string', enum: ['freelancer', 'recruiter'] },
              },
            },
          },
        },
      },
    },
    indexes: [
      { keys: { jobId: 1 } },
      { keys: { 'participants.addressLower': 1 } },
    ],
  },

  // ── Messages ──
  {
    name: 'messages',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['conversationId', 'sender', 'senderLower', 'content'],
        properties: {
          conversationId: { bsonType: 'string' },
          sender: { bsonType: 'string' },
          senderLower: { bsonType: 'string' },
          content: { bsonType: 'string' },
          type: { bsonType: 'string', enum: ['text', 'milestone_update', 'payment', 'system'] },
          read: { bsonType: 'bool' },
        },
      },
    },
    indexes: [
      { keys: { conversationId: 1 } },
      { keys: { senderLower: 1 } },
      { keys: { conversationId: 1, createdAt: -1 } },
    ],
  },

  // ── Counters (auto-increment helper) ──
  {
    name: 'counters',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['name', 'seq'],
        properties: {
          name: { bsonType: 'string', description: 'Counter name (e.g. jobId)' },
          seq: { bsonType: 'int', description: 'Current sequence value' },
        },
      },
    },
    indexes: [
      { keys: { name: 1 }, options: { unique: true } as any },
    ],
  },
];

// ============ Main ============

async function main() {
  console.log('🔗 Connecting to MongoDB...');
  console.log(`   URI: ${MONGODB_URI.replace(/:([^@]+)@/, ':****@')}`);

  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  const db = mongoose.connection.db!;
  console.log(`✅ Connected to database: ${db.databaseName}\n`);

  // ── Step 1: List existing collections ──
  const existing = (await db.listCollections().toArray()).map((c) => c.name);
  console.log(`📦 Existing collections: ${existing.length ? existing.join(', ') : '(none)'}\n`);

  // ── Step 2: Drop junk collections ──
  const junkCollections = existing.filter(
    (name) => !collections.some((c) => c.name === name) && name !== 'system.profile'
  );
  for (const junk of junkCollections) {
    console.log(`🗑️  Dropping junk collection: ${junk}`);
    await db.dropCollection(junk);
  }

  // ── Step 3: Create/update collections with validators ──
  for (const col of collections) {
    if (existing.includes(col.name)) {
      // Collection already exists — skip (Atlas M0 doesn't allow collMod)
      console.log(`   ℹ️  ${col.name} already exists, skipping validator update`);
    } else {
      // Create new collection
      console.log(`✨ Creating collection: ${col.name}`);
      await db.createCollection(col.name, {
        validator: col.validator,
        validationLevel: 'moderate',
        validationAction: 'warn',
      });
    }

    // ── Step 4: Create indexes ──
    const mongoCollection = db.collection(col.name);
    for (const idx of col.indexes) {
      try {
        await mongoCollection.createIndex(idx.keys as any, idx.options || {});
      } catch (err: any) {
        // Index may already exist with different options
        if (err.code === 85 || err.code === 86) {
          console.log(`   ⚠️  Index conflict on ${col.name}, skipping: ${JSON.stringify(idx.keys)}`);
        } else {
          throw err;
        }
      }
    }
    console.log(`   ✅ ${col.name}: ${col.indexes.length} indexes ensured`);
  }

  // ── Step 5: Seed initial data ──
  console.log('\n🌱 Seeding initial data...');

  // Ensure jobId counter exists
  const counters = db.collection('counters');
  const existingCounter = await counters.findOne({ name: 'jobId' });
  if (!existingCounter) {
    await counters.insertOne({ name: 'jobId', seq: 0 });
    console.log('   ✅ Created jobId counter (starting at 0)');
  } else {
    console.log(`   ℹ️  jobId counter already exists (current: ${existingCounter.seq})`);
  }

  // ── Step 6: Final summary ──
  // ── Step 6b: Sync Mongoose schema-level indexes (virtuals, compound, TTL) ──
  console.log('\n🔗 Syncing Mongoose schema-level indexes...');
  try {
    const { User } = await import('../models/User.js');
    const { Project } = await import('../models/Project.js');
    const { JobListing } = await import('../models/JobListing.js');
    const { Application } = await import('../models/Application.js');
    const { Message, Conversation } = await import('../models/Message.js');
    const { Nonce } = await import('../models/Nonce.js');
    const { SecureUser } = await import('../models/SecureUser.js');
    const { SkillSubmission } = await import('../models/SkillSubmission.js');

    const mongooseModels = [
      { name: 'User', m: User },
      { name: 'Project', m: Project },
      { name: 'JobListing', m: JobListing },
      { name: 'Application', m: Application },
      { name: 'Message', m: Message },
      { name: 'Conversation', m: Conversation },
      { name: 'Nonce', m: Nonce },
      { name: 'SecureUser', m: SecureUser },
      { name: 'SkillSubmission', m: SkillSubmission },
    ];

    for (const { name, m } of mongooseModels) {
      await m.createIndexes();
      const idxList = await m.listIndexes();
      console.log(`   ✅ ${name}: ${idxList.length} total indexes synced`);
    }
  } catch (err: any) {
    console.error('   ⚠️  Mongoose index sync warning:', err.message);
  }

  console.log('\n' + '═'.repeat(50));
  console.log('📊 Database Summary');
  console.log('═'.repeat(50));

  const finalCollections = (await db.listCollections().toArray()).map((c) => c.name).sort();
  for (const name of finalCollections) {
    const count = await db.collection(name).countDocuments();
    console.log(`   ${name.padEnd(20)} ${String(count).padStart(6)} docs`);
  }

  const dbStats = await db.stats();
  console.log('═'.repeat(50));
  console.log(`   Total size: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB / 512 MB (M0 limit)`);
  console.log(`   Collections: ${finalCollections.length}`);
  console.log('═'.repeat(50));

  console.log('\n✅ Database initialization complete!');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Database initialization failed:', err);
  process.exit(1);
});
