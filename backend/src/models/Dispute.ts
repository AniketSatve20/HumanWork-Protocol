import mongoose, { Schema, Document } from 'mongoose';

// ============ Enums matching Solidity DisputeJury ============

export enum DisputeOutcome {
  Pending = 0,
  AcceptAISplit = 1,
  ClientWins = 2,
  FreelancerWins = 3,
}

export enum VoteChoice {
  AcceptAI = 0,
  SideWithClient = 1,
  SideWithFreelancer = 2,
}

// ============ Interfaces ============

export interface IVote {
  juror: string;
  choice: VoteChoice;
  timestamp: Date;
}

export interface IDispute extends Document {
  disputeId: number;
  projectId: number;
  milestoneIndex: number;
  client: string;
  freelancer: string;
  amount: string;
  jurors: string[];
  votes: IVote[];
  votesAcceptAi: number;
  votesForClient: number;
  votesForFreelancer: number;
  outcome: DisputeOutcome;
  aiReport: string;
  aiRecommendedSplit: number;
  createdAt: Date;
  resolvedAt?: Date;
  fundsDistributed: boolean;
  transactionHash?: string;
  blockNumber?: number;
}

// ============ Schema ============

const VoteSchema = new Schema<IVote>(
  {
    juror: { type: String, required: true },
    choice: {
      type: Number,
      enum: [VoteChoice.AcceptAI, VoteChoice.SideWithClient, VoteChoice.SideWithFreelancer],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const DisputeSchema = new Schema<IDispute>(
  {
    disputeId: { type: Number, required: true, unique: true, index: true },
    projectId: { type: Number, required: true, index: true },
    milestoneIndex: { type: Number, required: true },
    client: { type: String, required: true, index: true },
    freelancer: { type: String, required: true, index: true },
    amount: { type: String, required: true },
    jurors: [{ type: String }],
    votes: [VoteSchema],
    votesAcceptAi: { type: Number, default: 0 },
    votesForClient: { type: Number, default: 0 },
    votesForFreelancer: { type: Number, default: 0 },
    outcome: {
      type: Number,
      enum: [DisputeOutcome.Pending, DisputeOutcome.AcceptAISplit, DisputeOutcome.ClientWins, DisputeOutcome.FreelancerWins],
      default: DisputeOutcome.Pending,
      index: true,
    },
    aiReport: { type: String, default: '' },
    aiRecommendedSplit: { type: Number, default: 50 },
    resolvedAt: { type: Date },
    fundsDistributed: { type: Boolean, default: false },
    transactionHash: { type: String },
    blockNumber: { type: Number },
  },
  {
    timestamps: true,
  }
);

DisputeSchema.index({ client: 1, outcome: 1 });
DisputeSchema.index({ freelancer: 1, outcome: 1 });
DisputeSchema.index({ createdAt: -1 });

export const Dispute = mongoose.model<IDispute>('Dispute', DisputeSchema);

export default Dispute;
