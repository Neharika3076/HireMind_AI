import mongoose from "mongoose";

const sessionQuestionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  prompt: { type: String, required: true },
  competency: { type: String, required: true },
  type: { type: String, enum: ["technical", "behavioral", "scenario", "role_specific"], default: "role_specific" },
  criteria: [{ key: String, label: String, guidance: String, maxScore: { type: Number, default: 4 } }]
}, { _id: false });

const answerSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  questionPrompt: { type: String, default: "" },
  kind: { type: String, enum: ["answer", "follow_up"], required: true },
  text: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  evaluationStatus: { type: String, enum: ["pending", "processing", "completed", "failed"], default: "pending" },
  evaluationError: { type: String, default: "" },
  evaluation: { type: mongoose.Schema.Types.Mixed, default: null }
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  invitationId: { type: mongoose.Schema.Types.ObjectId, ref: "AIInterviewInvitation", required: true, index: true },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "RecruitmentApplication", required: true, index: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "RecruitmentJob", required: true, index: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "RecruitmentCandidate", required: true, index: true },
  accessTokenHash: { type: String, required: true, select: false },
  status: { type: String, enum: ["in_progress", "completed", "evaluation_pending", "cancelled"], default: "in_progress", index: true },
  consent: { acceptedAt: { type: Date, required: true }, privacyVersion: { type: String, required: true }, focusMonitoringAccepted: { type: Boolean, default: false } },
  modelVersion: { type: String, required: true },
  rubricVersion: { type: String, required: true },
  questions: { type: [sessionQuestionSchema], default: [] },
  answers: { type: [answerSchema], default: [] },
  currentQuestionIndex: { type: Number, default: 0 },
  pendingFollowUp: { type: mongoose.Schema.Types.Mixed, default: null },
  followUpsUsed: { type: Number, default: 0 },
  maxFollowUps: { type: Number, min: 0, max: 2, default: 2 },
  warnings: { type: [String], default: [] },
  completedAt: { type: Date, default: null },
  retainUntil: { type: Date, required: true, expires: 0 }
}, { timestamps: true });

sessionSchema.index({ accessTokenHash: 1 }, { unique: true, sparse: true });
export const AIInterviewSession = mongoose.model("AIInterviewSession", sessionSchema);
