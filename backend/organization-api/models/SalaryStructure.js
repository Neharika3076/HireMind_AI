const mongoose = require("mongoose");

const componentSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 100 },
        amount: { type: Number, required: true, min: 0 }
    },
    { _id: false }
);

const salaryStructureSchema = new mongoose.Schema(
    {
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true
        },
        name: { type: String, required: true, trim: true, maxlength: 100 },
        currency: { type: String, required: true, default: "USD", match: /^[A-Z]{3}$/ },
        baseSalary: { type: Number, required: true, min: 0 },
        allowances: { type: [componentSchema], default: [] },
        deductions: { type: [componentSchema], default: [] },
        active: { type: Boolean, default: true }
    },
    { timestamps: true }
);

salaryStructureSchema.index({ organization: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("SalaryStructure", salaryStructureSchema);
