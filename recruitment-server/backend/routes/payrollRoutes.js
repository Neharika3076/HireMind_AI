const express = require("express");
const router = express.Router();

const Payroll = require("../models/payrollModel");

// GET all payroll records
router.get("/", async (req, res) => {
    try {
        const payroll = await Payroll.find()
            .sort({ year: -1, createdAt: -1 });

        res.status(200).json(payroll);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch payroll records",
            error: error.message
        });
    }
});

// GET payroll by ID
router.get("/:id", async (req, res) => {
    try {
        const payroll = await Payroll.findById(req.params.id);

        if (!payroll) {
            return res.status(404).json({
                message: "Payroll record not found"
            });
        }

        res.status(200).json(payroll);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch payroll record",
            error: error.message
        });
    }
});

// CREATE payroll record
router.post("/", async (req, res) => {
    try {
        const {
            employeeId,
            employeeName,
            month,
            year,
            basicSalary,
            allowances,
            deductions,
            status,
            paymentDate
        } = req.body;

        const netSalary =
            Number(basicSalary) +
            Number(allowances || 0) -
            Number(deductions || 0);

        if (
            !employeeId ||
            !employeeName ||
            !month ||
            year == null ||
            basicSalary == null
        ) {
            return res.status(400).json({
                message: "Please provide all required payroll fields"
            });
        }

        if (netSalary < 0) {
            return res.status(400).json({
                message: "Net salary cannot be negative"
            });
        }

        const payroll = await Payroll.create({
            employeeId,
            employeeName,
            month,
            year,
            basicSalary,
            allowances: allowances || 0,
            deductions: deductions || 0,
            netSalary,
            status,
            paymentDate
        });

        res.status(201).json({
            message: "Payroll created successfully",
            payroll
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Payroll already exists for this employee and month"
            });
        }

        res.status(500).json({
            message: "Failed to create payroll",
            error: error.message
        });
    }
});

// UPDATE payroll record
router.put("/:id", async (req, res) => {
    try {
        const allowedFields = [
            "employeeName",
            "month",
            "year",
            "basicSalary",
            "allowances",
            "deductions",
            "status",
            "paymentDate"
        ];

        const updates = {};

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const existingPayroll = await Payroll.findById(req.params.id);

        if (!existingPayroll) {
            return res.status(404).json({
                message: "Payroll record not found"
            });
        }

        const basicSalary =
            updates.basicSalary ?? existingPayroll.basicSalary;

        const allowances =
            updates.allowances ?? existingPayroll.allowances;

        const deductions =
            updates.deductions ?? existingPayroll.deductions;

        updates.netSalary =
            Number(basicSalary) +
            Number(allowances) -
            Number(deductions);

        if (updates.netSalary < 0) {
            return res.status(400).json({
                message: "Net salary cannot be negative"
            });
        }

        const payroll = await Payroll.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            message: "Payroll updated successfully",
            payroll
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to update payroll",
            error: error.message
        });
    }
});

// DELETE payroll record
router.delete("/:id", async (req, res) => {
    try {
        const payroll = await Payroll.findByIdAndDelete(req.params.id);

        if (!payroll) {
            return res.status(404).json({
                message: "Payroll record not found"
            });
        }

        res.status(200).json({
            message: "Payroll deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to delete payroll",
            error: error.message
        });
    }
});

module.exports = router;