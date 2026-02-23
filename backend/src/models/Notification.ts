import mongoose, { Document, Schema } from 'mongoose';

export enum NotificationType {
  // Job lifecycle
  JOB_APPLICATION = 'job_application',
  APPLICATION_ACCEPTED = 'application_accepted',
  APPLICATION_REJECTED = 'application_rejected',
  // Project lifecycle
  MILESTONE_COMPLETED = 'milestone_completed',
  MILESTONE_APPROVED = 'milestone_approved',
  PAYMENT_RELEASED = 'payment_released',
  PROJECT_COMPLETED = 'project_completed',
  PROJECT_CANCELLED = 'project_cancelled',
  // Disputes
  DISPUTE_CREATED = 'dispute_created',
  DISPUTE_RESOLVED = 'dispute_resolved',
  // Messaging
  NEW_MESSAGE = 'new_message',
  // Verification / skills
  SKILL_BADGE_EARNED = 'skill_badge_earned',
  VERIFICATION_COMPLETE = 'verification_complete',
  // Reviews
  NEW_REVIEW = 'new_review',
}

export interface INotification extends Document {
  recipientAddress: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientAddress: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientAddress: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
export default Notification;
