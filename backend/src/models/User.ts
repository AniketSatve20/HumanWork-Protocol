import mongoose, { Schema, Document } from 'mongoose';

// ============ Enums ============

export enum LegitimacyLevel {
  None = 0,
  Basic = 1,
  VerifiedHuman = 2,
}

// ============ Interfaces ============

export interface IAttestation {
  attestationType: number;
  referenceId: number;
  timestamp: Date;
  issuer: string;
  metadata?: string;
  isPositive: boolean;
}

export interface IUser extends Document {
  walletAddress: string;
  level: LegitimacyLevel;
  hasDeposited: boolean;
  registrationTime: Date;
  ensName?: string;

  displayName?: string;
  bio?: string;
  avatarIpfsHash?: string;
  skills?: string[];
  hourlyRate?: number;
  portfolio?: string[];
  socialLinks?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };

  attestations: IAttestation[];

  totalProjects: number;
  completedProjects: number;
  totalEarned: string;
  averageRating?: number;

  createdAt: Date;
  updatedAt: Date;
  lastSyncedBlock: number;

  walletAddressLower: string;
}

// ============ Schema ============

const AttestationSchema = new Schema<IAttestation>(
  {
    attestationType: { type: Number, required: true },
    referenceId: { type: Number, required: true },
    timestamp: { type: Date, required: true },
    issuer: { type: String, required: true },
    metadata: { type: String },
    isPositive: { type: Boolean, default: true },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    walletAddress: { type: String, required: true, unique: true, index: true },
    level: {
      type: Number,
      enum: Object.values(LegitimacyLevel).filter((v) => typeof v === 'number'),
      default: LegitimacyLevel.None,
    },
    hasDeposited: { type: Boolean, default: false },
    registrationTime: { type: Date },
    ensName: { type: String, index: true },

    displayName: { type: String, index: 'text' },
    bio: { type: String },
    avatarIpfsHash: { type: String },
    skills: [{ type: String, index: true }],
    hourlyRate: { type: Number },
    portfolio: [{ type: String }],
    socialLinks: {
      github: String,
      linkedin: String,
      twitter: String,
      website: String,
    },

    attestations: [AttestationSchema],

    totalProjects: { type: Number, default: 0 },
    completedProjects: { type: Number, default: 0 },
    totalEarned: { type: String, default: '0' },
    averageRating: { type: Number },

    lastSyncedBlock: { type: Number, default: 0 },

    walletAddressLower: { type: String, index: true },
  },
  {
    timestamps: true,
  }
);

UserSchema.pre('save', function (next) {
  if (this.walletAddress) {
    this.walletAddressLower = this.walletAddress.toLowerCase();
  }
  next();
});

UserSchema.index({ skills: 1, level: 1 });
UserSchema.index({ walletAddressLower: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);

export default User;
