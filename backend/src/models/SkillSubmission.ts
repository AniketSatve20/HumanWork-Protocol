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

    applicantLower: { type: String, index: true },
  },
  {
    timestamps: true,
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

export const SkillSubmission = mongoose.model<ISkillSubmission>('SkillSubmission', SkillSubmissionSchema);

export default SkillSubmission;
