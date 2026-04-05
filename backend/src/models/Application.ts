import mongoose, { Schema, Document } from 'mongoose';

// ============ Interfaces ============

export interface IApplication extends Document {
  jobId: number;
  freelancerAddress: string;
  freelancerAddressLower: string;
  coverLetter: string;
  proposedAmount: string;
  estimatedDuration: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

// ============ Schema ============

const ApplicationSchema = new Schema<IApplication>(
  {
    jobId: { type: Number, required: true, index: true },
    freelancerAddress: { type: String, required: true },
    freelancerAddressLower: { type: String, index: true, select: false },
    coverLetter: { type: String, required: true },
    proposedAmount: { type: String, required: true },
    estimatedDuration: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending', index: true },
  },
  { timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true, versionKey: false },
  }
);

ApplicationSchema.pre('save', function (next) {
  if (this.freelancerAddress) {
    this.freelancerAddressLower = this.freelancerAddress.toLowerCase();
  }
  next();
});

// One application per freelancer per job
ApplicationSchema.index({ jobId: 1, freelancerAddressLower: 1 }, { unique: true });
ApplicationSchema.index({ jobId: 1, status: 1 });

export const Application = mongoose.model<IApplication>('Application', ApplicationSchema);
export default Application;
