import mongoose from "mongoose";

const emailLogSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "RecruitmentApplication", default: null },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "RecruitmentCandidate", default: null },
  interviewId: { type: mongoose.Schema.Types.ObjectId, ref: "RecruitmentInterview", default: null },
  templateKey: { type: String, required: true },
  recipient: { type: String, required: true },
  subject: { type: String, required: true },
  status: { type: String, enum: ["sent", "failed"], required: true },
  providerMessageId: { type: String, default: "" },
  failureCategory: { type: String, default: "" },
  idempotencyKey: { type: String, required: true },
  sentBy: { id: String, name: String }
}, { timestamps: true });

emailLogSchema.index({ organizationId: 1, idempotencyKey: 1 }, { unique: true });
export const EmailLog = mongoose.model("RecruitmentEmailLog", emailLogSchema);
