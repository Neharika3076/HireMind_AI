
const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
  {
    organizationName: {
      type: String,
      required: true,
      trim: true
    },
    organizationCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Organization", organizationSchema);
