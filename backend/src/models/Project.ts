import mongoose, { Schema, Document } from 'mongoose';

// ============ Enums matching Solidity ============

export enum MilestoneStatus {
  Pending = 0,
  Completed = 1,
  Approved = 2,
  Disputed = 3,
}

export enum ProjectStatus {
  Active = 0,
  Completed = 1,
  Cancelled = 2,
}

// ============ Interfaces ============

export interface IMilestone {
  index: number;
  description: string;
  amount: string;
  status: MilestoneStatus;
  completionTime?: Date;
  deliverableIpfsHash?: string;
}

export interface IProject extends Document {
  projectId: number;
  client: string;
  freelancer: string;
  agencyId: number;
  totalAmount: string;
  amountPaid: string;
  status: ProjectStatus;
  milestones: IMilestone[];
  isEnterpriseProject: boolean;

  title: string;
  briefDescription: string;
  fullDescriptionIpfsHash?: string;
  category?: string;
  skills?: string[];
  deadline?: Date;

  transactionHash: string;
  blockNumber: number;
  createdAt: Date;
  updatedAt: Date;

  clientLower: string;
  freelancerLower: string;
}

// ============ Schema ============

const MilestoneSchema = new Schema<IMilestone>(
  {
    index: { type: Number, required: true },
    description: { type: String, required: true },
    amount: { type: String, required: true },
    status: {
      type: Number,
      enum: Object.values(MilestoneStatus).filter((v) => typeof v === 'number'),
      default: MilestoneStatus.Pending,
    },
    completionTime: { type: Date },
    deliverableIpfsHash: { type: String },
  },
  { _id: false }
);

const ProjectSchema = new Schema<IProject>(
  {
    projectId: { type: Number, required: true, unique: true, index: true },
    client: { type: String, required: true, index: true },
    freelancer: { type: String, required: true, index: true },
    agencyId: { type: Number, default: 0 },
    totalAmount: { type: String, required: true },
    amountPaid: { type: String, default: '0' },
    status: {
      type: Number,
      enum: Object.values(ProjectStatus).filter((v) => typeof v === 'number'),
      default: ProjectStatus.Active,
      index: true,
    },
    milestones: [MilestoneSchema],
    isEnterpriseProject: { type: Boolean, default: false },

    title: { type: String, required: true, index: 'text' },
    briefDescription: { type: String, required: true },
    fullDescriptionIpfsHash: { type: String },
    category: { type: String, index: true },
    skills: [{ type: String }],
    deadline: { type: Date },

    transactionHash: { type: String, required: true, index: true },
    blockNumber: { type: Number, required: true, index: true },

    clientLower: { type: String, index: true },
    freelancerLower: { type: String, index: true },
  },
  {
    timestamps: true,
  }
);

ProjectSchema.pre('save', function (next) {
  if (this.client) {
    this.clientLower = this.client.toLowerCase();
  }
  if (this.freelancer) {
    this.freelancerLower = this.freelancer.toLowerCase();
  }
  next();
});

ProjectSchema.index({ clientLower: 1, status: 1 });
ProjectSchema.index({ freelancerLower: 1, status: 1 });
ProjectSchema.index({ createdAt: -1 });
ProjectSchema.index({ blockNumber: -1 });

export const Project = mongoose.model<IProject>('Project', ProjectSchema);

export default Project;
