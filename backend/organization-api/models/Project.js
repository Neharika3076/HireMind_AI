
const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
      // trim: true,
    },
    description: {
      type: String,
      default: "",
      maxlength: 2000,
    },
    start: {
      type: String,
      default: "",
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
      enum: ["Assigned", "In Progress", "Completed"],
      default: "Assigned",
    },
    members: {
      type: Number,
      default: 0,
      min: 0,
    },
    color: {
      type: String,
      default: "teal",
    },
    teamMembers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    
    projectManagers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

  },
  { timestamps: true }
);

projectSchema.index({ organization: 1, createdAt: -1 });

module.exports = mongoose.model("Project", projectSchema);
