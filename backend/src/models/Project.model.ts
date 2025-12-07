// src/models/Project.model.ts (Example)

import mongoose, { Schema } from 'mongoose';

const ProjectSchema = new Schema({
  projectId: { type: Number, required: true, unique: true, index: true }, // Index 1
  client: { type: String, required: true, index: true }, // Index 2 (walletAddress)
  freelancer: { type: String, required: true, index: true }, // Index 3 (walletAddress)
  // ... other fields (milestones, status, etc.)
}, { timestamps: true });

// Add a compound index if you frequently query by client AND status
// ProjectSchema.index({ client: 1, status: 1 });

export const Project = mongoose.model('Project', ProjectSchema);