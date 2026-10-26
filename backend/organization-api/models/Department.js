const mongoose = require('mongoose');
const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
departmentSchema.index({ organization: 1, name: 1 }, { unique: true });
module.exports = mongoose.model('Department', departmentSchema);
