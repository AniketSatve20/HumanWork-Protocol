import mongoose, { Schema, Document } from 'mongoose';
import { encryptionPlugin, hashForSearch } from '../utils/encryption.js';

// ============ Interfaces ============

export interface IBankDetails {
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  accountHolderName: string;
}

export interface IKYCDocument {
  type: string;
  documentNumber: string;
  expiryDate?: Date;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedAt?: Date;
}

export interface IChatLog {
  timestamp: Date;
  sender: string;
  recipient: string;
  message: string;
  projectId?: number;
}

export interface ISecureUser extends Document {
  walletAddress: string;
  publicAlias: string;
  isKycVerified: boolean;
  registrationDate: Date;
  
  legalName: string;
  email: string;
  phone: string;
  taxId: string;
  nationalId: string;
  bankDetails: IBankDetails;
  kycDocuments: IKYCDocument[];
  chatLogs: IChatLog[];
  
  emailHash: string;
  phoneHash: string;
  
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
  
  consentGiven: boolean;
  consentDate?: Date;
  dataRetentionExpiry?: Date;
  deletionRequested: boolean;
  deletionRequestDate?: Date;

  erasePersonalData(): Promise<void>;
  exportPersonalData(): object;
  trackAccess(): Promise<void>;
}

// ============ Schema ============

const BankDetailsSchema = new Schema<IBankDetails>(
  {
    accountNumber: { type: String },
    ifscCode: { type: String },
    bankName: { type: String },
    accountHolderName: { type: String },
  },
  { _id: false }
);

const KYCDocumentSchema = new Schema<IKYCDocument>(
  {
    type: { type: String, required: true },
    documentNumber: { type: String, required: true },
    expiryDate: { type: Date },
    verificationStatus: { 
      type: String, 
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verifiedAt: { type: Date },
  },
  { _id: false }
);

const ChatLogSchema = new Schema<IChatLog>(
  {
    timestamp: { type: Date, default: Date.now },
    sender: { type: String, required: true },
    recipient: { type: String, required: true },
    message: { type: String, required: true },
    projectId: { type: Number },
  },
  { _id: false }
);

const SecureUserSchema = new Schema<ISecureUser>(
  {
    walletAddress: { type: String, required: true, unique: true, index: true },
    publicAlias: { type: String, index: true },
    isKycVerified: { type: Boolean, default: false },
    registrationDate: { type: Date, default: Date.now },
    
    legalName: { type: String },
    email: { type: String },
    phone: { type: String },
    taxId: { type: String },
    nationalId: { type: String },
    bankDetails: BankDetailsSchema,
    kycDocuments: [KYCDocumentSchema],
    chatLogs: [ChatLogSchema],
    
    emailHash: { type: String, index: true },
    phoneHash: { type: String, index: true },
    
    consentGiven: { type: Boolean, default: false },
    consentDate: { type: Date },
    dataRetentionExpiry: { type: Date },
    deletionRequested: { type: Boolean, default: false },
    deletionRequestDate: { type: Date },
    
    lastAccessedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Apply Encryption Plugin
SecureUserSchema.plugin(encryptionPlugin, {
  fields: [
    'legalName',
    'email',
    'phone',
    'taxId',
    'nationalId',
  ],
  exclude: ['_id', 'walletAddress', 'createdAt', 'updatedAt'],
});

// Instance Methods
SecureUserSchema.methods.erasePersonalData = async function(): Promise<void> {
  this.legalName = '[DELETED]';
  this.email = '[DELETED]';
  this.phone = '[DELETED]';
  this.taxId = '[DELETED]';
  this.nationalId = '[DELETED]';
  this.bankDetails = {
    accountNumber: '[DELETED]',
    ifscCode: '[DELETED]',
    bankName: '[DELETED]',
    accountHolderName: '[DELETED]',
  };
  this.kycDocuments = [];
  this.chatLogs = [];
  this.emailHash = '';
  this.phoneHash = '';
  this.deletionRequested = true;
  this.deletionRequestDate = new Date();
  await this.save();
};

SecureUserSchema.methods.exportPersonalData = function(): object {
  return {
    walletAddress: this.walletAddress,
    publicAlias: this.publicAlias,
    legalName: this.legalName,
    email: this.email,
    phone: this.phone,
    taxId: this.taxId,
    nationalId: this.nationalId,
    bankDetails: this.bankDetails,
    kycDocuments: this.kycDocuments,
    registrationDate: this.registrationDate,
    lastAccessedAt: this.lastAccessedAt,
    exportedAt: new Date().toISOString(),
  };
};

SecureUserSchema.methods.trackAccess = async function(): Promise<void> {
  this.lastAccessedAt = new Date();
  await this.save();
};

// Pre-save Hooks
SecureUserSchema.pre('save', function(next) {
  if (this.isModified('email') && this.email && !this.email.includes(':')) {
    this.emailHash = hashForSearch(this.email.toLowerCase());
  }
  if (this.isModified('phone') && this.phone && !this.phone.includes(':')) {
    this.phoneHash = hashForSearch(this.phone);
  }
  
  if (!this.dataRetentionExpiry) {
    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
    this.dataRetentionExpiry = twoYearsFromNow;
  }
  
  next();
});

export const SecureUser = mongoose.model<ISecureUser>('SecureUser', SecureUserSchema);

export default SecureUser;
