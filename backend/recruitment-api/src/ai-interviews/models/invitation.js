import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "RecruitmentApplication", required: true, index: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "RecruitmentJob", required: true, index: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "RecruitmentCandidate", required: true, index: true },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: "AIInterviewTemplate", required: true },
  templateSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  tokenHash: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true, index: true },
  retainUntil: { type: Date, required: true, expires: 0 },
  status: { type: String, enum: ["invited", "email_failed", "started", "completed", "revoked", "expired", "alternative_requested"], default: "invited", index: true },
  emailStatus: { type: String, enum: ["pending", "sent", "failed", "preview"], default: "pending" },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "AIInterviewSession", default: null },
  invitedBy: { id: String, name: String },
  lastSentAt: { type: Date, default: null },
  sendCount: { type: Number, default: 0 },
  alternativeReason: { type: String, default: "" },
  audit: [{ action: String, actor: { id: String, name: String }, at: { type: Date, default: Date.now } }]
}, { timestamps: true });

invitationSchema.index({ organizationId: 1, applicationId: 1 }, { unique: true });
invitationSchema.index({ organizationId: 1, jobId: 1, createdAt: -1 });
invitationSchema.index({ tokenHash: 1 }, { unique: true, sparse: true });
export const AIInterviewInvitation = mongoose.model("AIInterviewInvitation", invitationSchema);
