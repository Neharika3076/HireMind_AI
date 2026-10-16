import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  decision: { type: String, enum: ["needs_human_review", "progress_to_next_stage", "do_not_progress"], required: true },
  note: { type: String, default: "" },
  actor: { id: String, name: String },
  at: { type: Date, default: Date.now }
}, { _id: false });

const reportSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  invitationId: { type: mongoose.Schema.Types.ObjectId, ref: "AIInterviewInvitation", required: true, unique: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "AIInterviewSession", required: true },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "RecruitmentApplication", required: true, index: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "RecruitmentJob", required: true, index: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "RecruitmentCandidate", required: true, index: true },
  score: { type: Number, min: 0, max: 100, required: true },
  confidence: { type: Number, min: 0, max: 1, required: true },
  summary: { type: String, required: true },
  questionResults: { type: [mongoose.Schema.Types.Mixed], default: [] },
  warnings: { type: [String], default: [] },
  integritySummary: { type: mongoose.Schema.Types.Mixed, default: {} },
  modelVersion: { type: String, required: true },
  rubricVersion: { type: String, required: true },
  reviewHistory: { type: [reviewSchema], default: [] },
  retainUntil: { type: Date, required: true, expires: 0 }
}, { timestamps: true });

reportSchema.index({ organizationId: 1, jobId: 1, createdAt: -1 });
export const AIInterviewReport = mongoose.model("AIInterviewReport", reportSchema);
