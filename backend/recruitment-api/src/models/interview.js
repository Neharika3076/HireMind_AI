import mongoose from "mongoose";

const interviewSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "RecruitmentApplication", required: true, index: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "RecruitmentJob", required: true, index: true },
  round: { type: String, required: true },
  interviewers: [{ id: String, name: String, email: String }],
  startsAt: { type: Date, required: true, index: true },
  endsAt: { type: Date, required: true },
  timeZone: { type: String, required: true },
  mode: { type: String, enum: ["video", "phone", "onsite"], required: true },
  meetingLink: { type: String, default: "" },
  location: { type: String, default: "" },
  instructions: { type: String, default: "" },
  internalNotes: { type: String, default: "" },
  status: { type: String, enum: ["scheduled", "completed", "cancelled"], default: "scheduled" },
  feedback: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

export const Interview = mongoose.model("RecruitmentInterview", interviewSchema);
