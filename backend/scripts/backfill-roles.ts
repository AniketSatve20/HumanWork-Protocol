import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { SecureUser } from '../src/models/SecureUser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/humanwork';

async function backfillLegacyRoles(): Promise<void> {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);

    const result = await SecureUser.updateMany(
      { role: { $exists: false } },
      { $set: { role: 'freelancer' } }
    );

    console.log(`Matched legacy documents: ${result.matchedCount}`);
    console.log(`Modified documents: ${result.modifiedCount}`);
    console.log('Role backfill completed successfully.');
  } catch (error) {
    console.error('Role backfill failed:', error);
    process.exitCode = 1;
  } finally {
    try {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB.');
    } catch (disconnectError) {
      console.error('Failed to disconnect cleanly:', disconnectError);
    }
  }
}

void backfillLegacyRoles();