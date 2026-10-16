import mongoose from "mongoose";

const criterionSchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  guidance: { type: String, required: true }
}, { _id: false });

const templateSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  key: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: "" },
  questionCount: { type: Number, min: 3, max: 8, default: 5 },
  maxFollowUps: { type: Number, min: 0, max: 2, default: 2 },
  rubricVersion: { type: String, required: true },
  criteria: { type: [criterionSchema], default: [] },
  active: { type: Boolean, default: true }
}, { timestamps: true });

templateSchema.index({ organizationId: 1, key: 1 }, { unique: true });
export const AIInterviewTemplate = mongoose.model("AIInterviewTemplate", templateSchema);
