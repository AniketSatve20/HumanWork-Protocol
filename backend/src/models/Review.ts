import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
  projectId: number;
  reviewerAddress: string;
  revieweeAddress: string;
  reviewerRole: 'client' | 'freelancer';
  rating: number; // 1-5
  comment: string;
  skillTags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    projectId: { type: Number, required: true, index: true },
    reviewerAddress: { type: String, required: true, index: true },
    revieweeAddress: { type: String, required: true, index: true },
    reviewerRole: {
      type: String,
      enum: ['client', 'freelancer'],
      required: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, maxlength: 2000 },
    skillTags: [{ type: String }],
  },
  { timestamps: true }
);

// One review per project per reviewer
ReviewSchema.index({ projectId: 1, reviewerAddress: 1 }, { unique: true });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
export default Review;
