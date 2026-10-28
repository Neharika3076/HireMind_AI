import mongoose from "mongoose";

const screeningResultSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "RecruitmentApplication", default: null, index: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "RecruitmentJob", required: true, index: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "RecruitmentCandidate", default: null, index: true },
  resumeFile: { originalName: String, storageKey: String },
  status: { type: String, enum: ["processing", "completed", "failed"], default: "processing", index: true },
  result: { type: mongoose.Schema.Types.Mixed, default: null },
  failureCategory: { type: String, default: "" },
  failureMessage: { type: String, default: "" },
  analyzedAt: { type: Date, default: null }
}, { timestamps: true });

screeningResultSchema.index({ organizationId: 1, applicationId: 1, createdAt: -1 });
export const ScreeningResult = mongoose.model("RecruitmentScreeningResult", screeningResultSchema);
