import mongoose, { Schema, Document } from 'mongoose';

// ============ Enums ============

export enum SubmissionStatus {
  Pending = 0,
  Grading = 1,
  Graded = 2,
  Failed = 3,
}

// ============ Interfaces ============

export interface ISkillSubmission extends Document {
  submissionId: number;
  testId: number;
  applicant: string;
  submissionIpfsHash: string;
  status: SubmissionStatus;
  score?: number;
  aiReport?: string;

  testTitle?: string;
  testDescription?: string;
  testFee?: string;

  gradingStartedAt?: Date;
  gradingCompletedAt?: Date;
  aiModelUsed?: string;
  gradingDetails?: {
    correctness: number;
    security: number;
    efficiency: number;
    style: number;
    feedback: string;
  };

  badgeTokenId?: number;
  badgeMintedAt?: Date;

  transactionHash: string;
  blockNumber: number;
  createdAt: Date;
  updatedAt: Date;

  applicantLower: string;
}

interface ISkillSubmissionCounter extends Document {
  name: string;
  seq: number;
}

// ============ Schema ============

const GradingDetailsSchema = new Schema(
  {
    correctness: { type: Number, min: 0, max: 100 },
    security: { type: Number, min: 0, max: 100 },
    efficiency: { type: Number, min: 0, max: 100 },
    style: { type: Number, min: 0, max: 100 },
    feedback: { type: String },
  },
  { _id: false }
);

const SkillSubmissionSchema = new Schema<ISkillSubmission>(
  {
    submissionId: { type: Number, required: true, unique: true, index: true },
    testId: { type: Number, required: true, index: true },
    applicant: { type: String, required: true, index: true },
    submissionIpfsHash: { type: String, required: true },
    status: {
      type: Number,
      enum: Object.values(SubmissionStatus).filter((v) => typeof v === 'number'),
      default: SubmissionStatus.Pending,
      index: true,
    },
    score: { type: Number, min: 0, max: 100 },
    aiReport: { type: String },

    testTitle: { type: String },
    testDescription: { type: String },
    testFee: { type: String },

    gradingStartedAt: { type: Date },
    gradingCompletedAt: { type: Date },
    aiModelUsed: { type: String },
    gradingDetails: GradingDetailsSchema,

    badgeTokenId: { type: Number },
    badgeMintedAt: { type: Date },

    transactionHash: { type: String, required: true, index: true },
    blockNumber: { type: Number, required: true, index: true },

    applicantLower: { type: String, index: true, select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true, versionKey: false },
  }
);

SkillSubmissionSchema.pre('save', function (next) {
  if (this.applicant) {
    this.applicantLower = this.applicant.toLowerCase();
  }
  next();
});

SkillSubmissionSchema.index({ applicantLower: 1, status: 1 });
SkillSubmissionSchema.index({ testId: 1, status: 1 });

const SkillSubmissionCounterSchema = new Schema<ISkillSubmissionCounter>(
  {
    name: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 },
  },
  {
    versionKey: false,
  }
);

const SkillSubmissionCounter = mongoose.model<ISkillSubmissionCounter>(
  'SkillSubmissionCounter',
  SkillSubmissionCounterSchema
);

/**
 * Generate a unique temporary submission ID from a monotonic counter.
 *
 * Negative IDs are reserved for local pending records so they never collide
 * with on-chain uint256 submission IDs (which are non-negative).
 */
export async function getNextTemporarySubmissionId(): Promise<number> {
  const counter = await SkillSubmissionCounter.findOneAndUpdate(
    { name: 'skillSubmissionTempId' },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );

  if (!counter) {
    throw new Error('Failed to allocate temporary skill submission ID');
  }

  return -Math.abs(counter.seq);
}

export const SkillSubmission = mongoose.model<ISkillSubmission>('SkillSubmission', SkillSubmissionSchema);

export default SkillSubmission;
