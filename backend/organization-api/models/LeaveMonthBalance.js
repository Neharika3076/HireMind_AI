const mongoose = require("mongoose");

const leaveMonthBalanceSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    monthKey: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}$/
    },
    daysUsed: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { timestamps: true }
);

leaveMonthBalanceSchema.index(
  { organization: 1, user: 1, monthKey: 1 },
  { unique: true }
);

module.exports = mongoose.model("LeaveMonthBalance", leaveMonthBalanceSchema);
