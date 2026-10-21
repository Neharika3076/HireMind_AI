
const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    project: {
      type: String,
      required: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    team: {
      type: String,
      default: "Engineering",
      trim: true,
    },

    manager: {
      type: String,
      default: "Unassigned",
      trim: true,
    },

    lead: {
      type: String,
      default: "Unassigned",
      trim: true,
    },

    member: {
      type: String,
      default: "Unassigned",
      trim: true,
    },

    priority: {
      type: String,
      enum: ["Critical", "High", "Medium", "Low"],
      default: "High",
    },

    due: {
      type: String,
      default: "",
    },

    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    status: {
      type: String,
      enum: ["Assigned", "In Progress", "Pending Review", "Completed"],
      default: "Assigned",
    },

    description: {
      type: String,
      default: "",
      maxlength: 2000,
    },

    category: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

taskSchema.index({ organization: 1, createdAt: -1 });

module.exports = mongoose.model("Task", taskSchema);
