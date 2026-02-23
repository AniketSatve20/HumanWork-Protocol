import mongoose, { Schema, Document } from 'mongoose';

// ============ Interfaces ============

export interface IJobMilestone {
  description: string;
  amount: string;
}

export interface IJobListing extends Document {
  jobId: number;
  clientAddress: string;
  clientAddressLower: string;
  title: string;
  description: string;
  category: string;
  skills: string[];
  duration: string;
  milestones: IJobMilestone[];
  budget: string;
  status: 'open' | 'assigned' | 'closed';
  applicantCount: number;
  assignedFreelancerAddress?: string;
  onChainProjectId?: number;
  ipfsHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============ Counter helper ============

const CounterSchema = new Schema({ name: { type: String, required: true, unique: true }, seq: { type: Number, default: 0 } });
const Counter = mongoose.model('Counter', CounterSchema);

export async function getNextJobId(): Promise<number> {
  const doc = await Counter.findOneAndUpdate(
    { name: 'jobId' },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  if (!doc) throw new Error('Failed to get next job ID from counter');
  return doc.seq;
}

// ============ Schema ============

const JobMilestoneSchema = new Schema<IJobMilestone>(
  {
    description: { type: String, required: true },
    amount: { type: String, required: true },
  },
  { _id: false }
);

const JobListingSchema = new Schema<IJobListing>(
  {
    jobId: { type: Number, required: true, unique: true, index: true },
    clientAddress: { type: String, required: true, index: true },
    clientAddressLower: { type: String, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, index: true },
    skills: [{ type: String }],
    duration: { type: String },
    milestones: [JobMilestoneSchema],
    budget: { type: String, required: true },
    status: { type: String, enum: ['open', 'assigned', 'closed'], default: 'open', index: true },
    applicantCount: { type: Number, default: 0 },
    assignedFreelancerAddress: { type: String },
    onChainProjectId: { type: Number },
    ipfsHash: { type: String },
  },
  { timestamps: true }
);

JobListingSchema.pre('save', function (next) {
  if (this.clientAddress) {
    this.clientAddressLower = this.clientAddress.toLowerCase();
  }
  next();
});

JobListingSchema.index({ clientAddressLower: 1, status: 1 });
JobListingSchema.index({ createdAt: -1 });

export const JobListing = mongoose.model<IJobListing>('JobListing', JobListingSchema);
export default JobListing;
