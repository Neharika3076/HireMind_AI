import mongoose from "mongoose";

const candidateSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  fullName: { type: String, default: "Not provided" },
  email: { type: String, default: "", lowercase: true, trim: true },
  phone: { type: String, default: "" },
  location: { type: String, default: "" },
  address: { type: String, default: "" },
  professionalSummary: { type: String, default: "" },
  profile: { type: mongoose.Schema.Types.Mixed, default: {} },
  resumeFiles: [{ originalName: String, storageKey: String, mimeType: String, size: Number, uploadedAt: Date }],
  notes: [{ body: String, author: { id: String, name: String }, createdAt: { type: Date, default: Date.now } }]
}, { timestamps: true });

candidateSchema.index({ organizationId: 1, email: 1 });
export const Candidate = mongoose.model("RecruitmentCandidate", candidateSchema);
