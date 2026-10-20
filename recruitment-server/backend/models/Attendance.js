const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
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
    dateKey: {
      type: String,
      required: true
    },
    checkInAt: {
      type: Date,
      required: true
    },
    checkOutAt: {
      type: Date,
      default: null
    },
    durationSeconds: {
      type: Number,
      default: null,
      min: 0
    },
    status: {
      type: String,
      enum: ["present", "half_day", "checked_out"],
      default: "present"
    }
  },
  { timestamps: true }
);

attendanceSchema.index({ organization: 1, user: 1, dateKey: 1 }, { unique: true });
attendanceSchema.index({ organization: 1, dateKey: 1, checkInAt: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
