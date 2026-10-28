const mongoose = require("mongoose");

const payrollSchema = new mongoose.Schema(
    {
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true
        },
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        employeeName: {
            type: String,
            required: true,
            trim: true
        },

        month: {
            type: String,
            required: true
        },

        year: {
            type: Number,
            required: true
        },

        basicSalary: {
            type: Number,
            required: true,
            min: 0
        },

        salaryStructure: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SalaryStructure",
            required: true
        },

        salaryStructureName: {
            type: String,
            required: true,
            trim: true
        },

        currency: {
            type: String,
            required: true,
            default: "USD",
            match: /^[A-Z]{3}$/
        },

        allowances: {
            type: Number,
            default: 0,
            min: 0
        },

        earnings: {
            type: [{
                name: { type: String, required: true, trim: true },
                amount: { type: Number, required: true, min: 0 }
            }],
            default: []
        },

        deductions: {
            type: Number,
            default: 0,
            min: 0
        },

        deductionItems: {
            type: [{
                name: { type: String, required: true, trim: true },
                amount: { type: Number, required: true, min: 0 }
            }],
            default: []
        },

        netSalary: {
            type: Number,
            required: true,
            min: 0
        },

        status: {
            type: String,
            enum: ["Pending", "Processed", "Paid"],
            default: "Pending"
        },

        paymentDate: {
            type: Date,
            default: null
        },

        processedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    {
        timestamps: true
    }
);

payrollSchema.index(
    { organization: 1, employeeId: 1, month: 1, year: 1 },
    { unique: true }
);

const Payroll = mongoose.model("Payroll", payrollSchema);

module.exports = Payroll;