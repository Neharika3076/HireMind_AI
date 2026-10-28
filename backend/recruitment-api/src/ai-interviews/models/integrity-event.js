import mongoose from "mongoose";

const integrityEventSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  invitationId: { type: mongoose.Schema.Types.ObjectId, ref: "AIInterviewInvitation", required: true, index: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "AIInterviewSession", required: true, index: true },
  type: { type: String, enum: ["tab_focus_lost", "connection_interrupted", "alternative_requested"], required: true },
  occurredAt: { type: Date, default: Date.now },
  details: { type: String, default: "" },
  reviewStatus: { type: String, enum: ["unreviewed", "reviewed", "not_concerning"], default: "unreviewed" },
  retainUntil: { type: Date, required: true, expires: 0 }
}, { timestamps: true });

integrityEventSchema.index({ organizationId: 1, sessionId: 1, occurredAt: -1 });
export const AIInterviewIntegrityEvent = mongoose.model("AIInterviewIntegrityEvent", integrityEventSchema);
