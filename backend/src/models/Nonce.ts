import mongoose, { Schema, Document } from 'mongoose';

export interface INonce extends Document {
  address: string;
  nonce: string;
  message: string;
  expiresAt: Date;
}

const NonceSchema = new Schema<INonce>(
  {
    address: { type: String, required: true, unique: true, index: true },
    nonce: { type: String, required: true },
    message: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index — MongoDB auto-deletes expired docs
  },
  { timestamps: true }
);

export const Nonce = mongoose.model<INonce>('Nonce', NonceSchema);
export default Nonce;
