import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  companyName: { type: String, default: "Organization", trim: true },
  title: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  hiringManagerId: { type: String, default: "" },
  hiringManagerName: { type: String, default: "" },
  employmentType: { type: String, enum: ["full-time", "part-time", "contract", "internship"], required: true },
  workArrangement: { type: String, enum: ["onsite", "hybrid", "remote"], required: true },
  location: { type: String, default: "" },
  description: { type: String, required: true },
  responsibilities: { type: [String], default: [] },
  requiredSkills: { type: [String], default: [] },
  preferredSkills: { type: [String], default: [] },
  minimumExperience: { type: Number, min: 0, default: 0 },
  preferredExperience: { type: Number, min: 0, default: 0 },
  educationRequirements: { type: [String], default: [] },
  certifications: { type: [String], default: [] },
  openings: { type: Number, min: 1, required: true },
  applicationDeadline: { type: Date, default: null },
  status: { type: String, enum: ["draft", "published", "closed", "archived"], default: "draft", index: true },
  aiJobProfile: { type: mongoose.Schema.Types.Mixed, default: null },
  aiProfileReviewedAt: { type: Date, default: null },
  createdBy: { id: String, name: String },
  updatedBy: { id: String, name: String }
}, { timestamps: true });

jobSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
export const Job = mongoose.model("RecruitmentJob", jobSchema);
