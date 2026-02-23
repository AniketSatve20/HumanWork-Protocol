import mongoose, { Document, Schema } from 'mongoose';

export enum DisputeStatus {
  Pending = 'pending',
  VotingOpen = 'voting_open',
  Resolved = 'resolved',
  Cancelled = 'cancelled',
}

export enum DisputeOutcome {
  AcceptAISplit = 'accept_ai_split',
  ClientWins = 'client_wins',
  FreelancerWins = 'freelancer_wins',
}

export interface IDisputeEvidence {
  submittedBy: string;
  description: string;
  ipfsHash?: string;
  submittedAt: Date;
}

export interface IDispute extends Document {
  onChainDisputeId?: number;
  projectId: number;
  milestoneIndex: number;
  clientAddress: string;
  freelancerAddress: string;
  amount: string;
  reason: string;
  evidence: IDisputeEvidence[];
  aiReport?: string;
  aiRecommendedSplit?: number;
  status: DisputeStatus;
  outcome?: DisputeOutcome;
  jurors?: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

const EvidenceSchema = new Schema<IDisputeEvidence>(
  {
    submittedBy: { type: String, required: true },
    description: { type: String, required: true },
    ipfsHash: { type: String },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const DisputeSchema = new Schema<IDispute>(
  {
    onChainDisputeId: { type: Number, index: true },
    projectId: { type: Number, required: true, index: true },
    milestoneIndex: { type: Number, required: true },
    clientAddress: { type: String, required: true, index: true },
    freelancerAddress: { type: String, required: true, index: true },
    amount: { type: String, required: true },
    reason: { type: String, required: true },
    evidence: [EvidenceSchema],
    aiReport: { type: String },
    aiRecommendedSplit: { type: Number },
    status: {
      type: String,
      enum: Object.values(DisputeStatus),
      default: DisputeStatus.Pending,
      index: true,
    },
    outcome: {
      type: String,
      enum: Object.values(DisputeOutcome),
    },
    jurors: [{ type: String }],
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

export const Dispute = mongoose.model<IDispute>('Dispute', DisputeSchema);
export default Dispute;
