import mongoose from "mongoose";

const statusEventSchema = new mongoose.Schema({
  status: String,
  actor: { id: String, name: String },
  note: { type: String, default: "" },
  changedAt: { type: Date, default: Date.now }
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "RecruitmentCandidate", required: true, index: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "RecruitmentJob", required: true, index: true },
  status: { type: String, enum: ["applied", "resume_processing", "awaiting_review", "shortlisted", "interview_scheduled", "interview_completed", "decision_pending", "offer_extended", "offer_accepted", "hired", "not_selected"], default: "awaiting_review", index: true },
  assignedRecruiter: { id: String, name: String },
  applicationNote: { type: String, default: "" },
  appliedAt: { type: Date, default: Date.now },
  statusHistory: { type: [statusEventSchema], default: [] }
}, { timestamps: true });

applicationSchema.index({ organizationId: 1, candidateId: 1, jobId: 1 }, { unique: true });
export const Application = mongoose.model("RecruitmentApplication", applicationSchema);
