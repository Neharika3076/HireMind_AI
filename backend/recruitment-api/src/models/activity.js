import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  actor: { id: String, name: String },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

activitySchema.index({ organizationId: 1, createdAt: -1 });
export const RecruitmentActivity = mongoose.model("RecruitmentActivity", activitySchema);
