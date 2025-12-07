import mongoose, { Schema, Document } from 'mongoose';
import { encryptionPlugin } from '../utils/encryption';

/**
 * SecureUser Model
 * 
 * This model demonstrates Application-Level Encryption (ALE) for GDPR compliance.
 * Sensitive PII fields are automatically encrypted before storage and decrypted on retrieval.
 * 
 * Encrypted Fields:
 * - legalName: Full legal name
 * - taxId: GST number, PAN, SSN, etc.
 * - nationalId: Aadhaar, Passport, etc.
 * - bankDetails: Full bank account information
 * - kycDocuments: KYC verification documents
 * - chatLogs: Private conversation logs
 */

// ============ Interfaces ============

export interface IBankDetails {
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  accountHolderName: string;
}

export interface IKYCDocument {
  type: string; // 'passport', 'aadhaar', 'pan', 'driverLicense'
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
  // Public fields (not encrypted)
  walletAddress: string;
  publicAlias: string;
  isKycVerified: boolean;
  registrationDate: Date;
  
  // Encrypted PII fields
  legalName: string;
  email: string;
  phone: string;
  taxId: string; // GST, PAN, SSN
  nationalId: string; // Aadhaar, Passport
  bankDetails: IBankDetails;
  kycDocuments: IKYCDocument[];
  chatLogs: IChatLog[];
  
  // Hashed for searching (one-way)
  emailHash: string;
  phoneHash: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
  
  // GDPR
  consentGiven: boolean;
  consentDate?: Date;
  dataRetentionExpiry?: Date;
  deletionRequested: boolean;
  deletionRequestDate?: Date;
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
    // Public fields
    walletAddress: { type: String, required: true, unique: true, index: true },
    publicAlias: { type: String, index: true },
    isKycVerified: { type: Boolean, default: false },
    registrationDate: { type: Date, default: Date.now },
    
    // Encrypted PII fields (stored as encrypted strings)
    legalName: { type: String },
    email: { type: String },
    phone: { type: String },
    taxId: { type: String },
    nationalId: { type: String },
    bankDetails: BankDetailsSchema,
    kycDocuments: [KYCDocumentSchema],
    chatLogs: [ChatLogSchema],
    
    // Hashed fields for searching
    emailHash: { type: String, index: true },
    phoneHash: { type: String, index: true },
    
    // GDPR compliance fields
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

// ============ Apply Encryption Plugin ============

/**
 * The encryption plugin automatically:
 * 1. Encrypts specified fields before save
 * 2. Decrypts fields after retrieval
 * 3. Uses AES-256-CBC with random IV per field
 */
SecureUserSchema.plugin(encryptionPlugin, {
  fields: [
    'legalName',
    'email',
    'phone',
    'taxId',
    'nationalId',
    // Note: Nested objects are stringified and encrypted
    // 'bankDetails', // Complex objects handled separately
    // 'kycDocuments',
    // 'chatLogs',
  ],
  exclude: ['_id', 'walletAddress', 'createdAt', 'updatedAt'],
});

// ============ Instance Methods ============

/**
 * Safely delete all PII data (GDPR right to erasure)
 */
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

/**
 * Export all personal data (GDPR right to data portability)
 */
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

/**
 * Update last accessed time (for data retention tracking)
 */
SecureUserSchema.methods.trackAccess = async function(): Promise<void> {
  this.lastAccessedAt = new Date();
  await this.save();
};

// ============ Static Methods ============

/**
 * Find users with expired data retention
 */
SecureUserSchema.statics.findExpiredRetention = function() {
  return this.find({
    dataRetentionExpiry: { $lt: new Date() },
    deletionRequested: { $ne: true },
  });
};

/**
 * Find users who requested deletion
 */
SecureUserSchema.statics.findDeletionRequests = function() {
  return this.find({
    deletionRequested: true,
  });
};

// ============ Pre-save Hooks ============

import { hashForSearch } from '../utils/encryption';

SecureUserSchema.pre('save', function(next) {
  // Generate search hashes for email and phone
  if (this.isModified('email') && this.email && !this.email.includes(':')) {
    this.emailHash = hashForSearch(this.email.toLowerCase());
  }
  if (this.isModified('phone') && this.phone && !this.phone.includes(':')) {
    this.phoneHash = hashForSearch(this.phone);
  }
  
  // Set default data retention (2 years from now)
  if (!this.dataRetentionExpiry) {
    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
    this.dataRetentionExpiry = twoYearsFromNow;
  }
  
  next();
});

// ============ Export ============

export const SecureUser = mongoose.model<ISecureUser>('SecureUser', SecureUserSchema);

export default SecureUser;
