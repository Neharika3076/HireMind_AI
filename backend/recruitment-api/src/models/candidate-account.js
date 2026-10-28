import mongoose from "mongoose";

const candidateAccountSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  passwordSalt: { type: String, required: true, select: false },
  passwordHash: { type: String, required: true, select: false },
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, default: "" }
}, { timestamps: true });

candidateAccountSchema.index({ email: 1 }, { unique: true });
export const CandidateAccount = mongoose.model("RecruitmentCandidateAccount", candidateAccountSchema);
  