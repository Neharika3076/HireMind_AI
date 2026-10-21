const mongoose = require("mongoose");

const payrollSchema = new mongoose.Schema(
    {
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

        allowances: {
            type: Number,
            default: 0,
            min: 0
        },

        deductions: {
            type: Number,
            default: 0,
            min: 0
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
        }
    },
    {
        timestamps: true
    }
);

payrollSchema.index(
    { employeeId: 1, month: 1, year: 1 },
    { unique: true }
);

const Payroll = mongoose.model("Payroll", payrollSchema);

module.exports = Payroll;