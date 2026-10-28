const mongoose = require("mongoose");

const leaveRequestSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    startDateKey: {
      type: String,
      required: true
    },
    endDateKey: {
      type: String,
      required: true
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    decidedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

leaveRequestSchema.index({ organization: 1, user: 1, startDateKey: 1, endDateKey: 1 });

module.exports = mongoose.model("LeaveRequest", leaveRequestSchema);
