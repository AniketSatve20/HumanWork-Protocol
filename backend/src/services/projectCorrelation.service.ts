import { randomUUID } from 'crypto';
import mongoose, { Document, Schema } from 'mongoose';

export interface PendingProjectMetadata {
  ipfsHash?: string;
  title?: string;
  description?: string;
  category?: string;
  skills?: string[];
  milestones?: Array<{ description?: string; amount?: string }>;
}

interface IProjectMetadataCorrelation extends Document {
  correlationId: string;
  clientAddressLower: string;
  metadata: PendingProjectMetadata;
  status: 'pending' | 'consumed';
  projectId?: number;
  consumedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CORRELATION_TAG_REGEX = /\[HWCID:([0-9a-f-]{36})\]/i;

const PENDING_TTL_MS = 24 * 60 * 60 * 1000;
const CONSUMED_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const ProjectMetadataCorrelationSchema = new Schema<IProjectMetadataCorrelation>(
  {
    correlationId: { type: String, required: true, unique: true, index: true },
    clientAddressLower: { type: String, required: true, index: true },
    metadata: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ['pending', 'consumed'],
      default: 'pending',
      index: true,
    },
    projectId: { type: Number },
    consumedAt: { type: Date },
    expiresAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
  }
);

ProjectMetadataCorrelationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
ProjectMetadataCorrelationSchema.index({ clientAddressLower: 1, status: 1 });

const ProjectMetadataCorrelation =
  (mongoose.models.ProjectMetadataCorrelation as mongoose.Model<IProjectMetadataCorrelation>) ||
  mongoose.model<IProjectMetadataCorrelation>('ProjectMetadataCorrelation', ProjectMetadataCorrelationSchema);

function normalizeCorrelationId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

function ensureCorrelationId(value?: string): string {
  return normalizeCorrelationId(value) ?? randomUUID();
}

export function buildProjectCorrelationTag(correlationId: string): string {
  return `[HWCID:${correlationId}]`;
}

export function extractProjectCorrelationId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = value.match(CORRELATION_TAG_REGEX);
  return normalizeCorrelationId(match?.[1]) ?? null;
}

export function stripProjectCorrelationTag(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(CORRELATION_TAG_REGEX, '').trim();
}

export async function registerPendingProjectMetadata(params: {
  clientAddress: string;
  metadata: PendingProjectMetadata;
  correlationId?: string;
}): Promise<{ correlationId: string; correlationTag: string }> {
  const clientAddressLower = params.clientAddress.toLowerCase();
  let correlationId = ensureCorrelationId(params.correlationId);

  const existing = await ProjectMetadataCorrelation.findOne(
    { correlationId },
    { clientAddressLower: 1 }
  ).lean();

  if (existing?.clientAddressLower && existing.clientAddressLower !== clientAddressLower) {
    correlationId = randomUUID();
  }

  await ProjectMetadataCorrelation.findOneAndUpdate(
    { correlationId },
    {
      $set: {
        clientAddressLower,
        metadata: params.metadata,
        status: 'pending',
        expiresAt: new Date(Date.now() + PENDING_TTL_MS),
      },
      $setOnInsert: { correlationId },
      $unset: { projectId: 1, consumedAt: 1 },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  return {
    correlationId,
    correlationTag: buildProjectCorrelationTag(correlationId),
  };
}

export async function consumePendingProjectMetadata(params: {
  correlationId: string;
  clientAddress: string;
  projectId: number;
}): Promise<PendingProjectMetadata | null> {
  const normalizedCorrelationId = normalizeCorrelationId(params.correlationId);
  if (!normalizedCorrelationId) return null;

  const record = await ProjectMetadataCorrelation.findOneAndUpdate(
    {
      correlationId: normalizedCorrelationId,
      clientAddressLower: params.clientAddress.toLowerCase(),
      status: 'pending',
    },
    {
      $set: {
        status: 'consumed',
        projectId: params.projectId,
        consumedAt: new Date(),
        expiresAt: new Date(Date.now() + CONSUMED_TTL_MS),
      },
    },
    { new: false }
  );

  if (!record) return null;
  return (record.metadata || {}) as PendingProjectMetadata;
}
