const express = require("express");
const mongoose = require("mongoose");
const Payroll = require("../models/payrollModel");
const SalaryStructure = require("../models/SalaryStructure");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const { calculatePayroll, parsePayrollMonth } = require("../services/payroll-calculations");

const router = express.Router();
const payrollRoles = ["executive", "manager", "employee"];
function requirePayrollManager(req, res, next) {
    if (req.user.role !== "admin" && !req.user.isHiringDepartment) {
        return res.status(403).json({
            success: false,
            message: "Administrator or HR & Hiring department access required."
        });
    }
    next();
}

router.use(requireAuth);

router.use((req, res, next) => {
    if (!req.user.organization || !mongoose.isValidObjectId(req.user.organization)) {
        return res.status(403).json({
            success: false,
            message: "Your account is not assigned to an organization."
        });
    }
    next();
});

function validId(value) {
    return mongoose.isValidObjectId(value);
}

function validateComponents(value, label) {
    if (!Array.isArray(value) || value.length > 50) {
        return { error: `${label} must be a list of up to 50 items.` };
    }

    const components = [];
    for (const item of value) {
        const name = typeof item?.name === "string" ? item.name.trim() : "";
        const amount = Number(item?.amount);
        if (!name || name.length > 100 || !Number.isFinite(amount) || amount < 0) {
            return { error: `Each ${label.toLowerCase()} item needs a name and a non-negative amount.` };
        }
        components.push({ name, amount: Math.round(amount * 100) / 100 });
    }
    return { components };
}

function validateSalaryStructure(body, { partial = false } = {}) {
    const updates = {};
    if (!partial || body.name !== undefined) {
        if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 100) {
            return { error: "Enter a salary structure name of up to 100 characters." };
        }
        updates.name = body.name.trim();
    }
    if (!partial || body.baseSalary !== undefined) {
        const baseSalary = Number(body.baseSalary);
        if (!Number.isFinite(baseSalary) || baseSalary < 0) {
            return { error: "Base salary must be a non-negative amount." };
        }
        updates.baseSalary = Math.round(baseSalary * 100) / 100;
    }
    for (const field of ["allowances", "deductions"]) {
        if (!partial || body[field] !== undefined) {
            const value = body[field] === undefined && !partial ? [] : body[field];
            const result = validateComponents(value, field);
            if (result.error) return result;
            updates[field] = result.components;
        }
    }
    if (body.currency !== undefined) {
        if (typeof body.currency !== "string" || !/^[A-Z]{3}$/.test(body.currency)) {
            return { error: "Currency must be a three-letter uppercase code." };
        }
        updates.currency = body.currency;
    } else if (!partial) {
        updates.currency = "USD";
    }
    if (body.active !== undefined) {
        if (typeof body.active !== "boolean") {
            return { error: "Active must be true or false." };
        }
        updates.active = body.active;
    }
    const baseSalary = updates.baseSalary;
    const allowances = updates.allowances || [];
    const deductions = updates.deductions || [];
    if (!partial) {
        const earningsTotal = allowances.reduce((total, item) => total + Number(item.amount), 0);
        const deductionsTotal = deductions.reduce((total, item) => total + Number(item.amount), 0);
        if (baseSalary + earningsTotal < deductionsTotal) {
            return { error: "Total deductions cannot exceed base salary and allowances." };
        }
    }
    return { updates };
}

router.get("/structures", requirePayrollManager, async (req, res) => {
    try {
        const structures = await SalaryStructure.find({
            organization: req.user.organization
        }).sort({ active: -1, name: 1 }).lean();
        return res.json({ success: true, structures });
    } catch (error) {
        console.error("List salary structures error:", error);
        return res.status(500).json({ success: false, message: "Unable to load salary structures." });
    }
});

router.post("/structures", requirePayrollManager, async (req, res) => {
    const validation = validateSalaryStructure(req.body || {});
    if (validation.error) {
        return res.status(400).json({ success: false, message: validation.error });
    }
    try {
        const structure = await SalaryStructure.create({
            ...validation.updates,
            organization: req.user.organization
        });
        return res.status(201).json({ success: true, structure });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: "A salary structure with this name already exists." });
        }
        console.error("Create salary structure error:", error);
        return res.status(500).json({ success: false, message: "Unable to create the salary structure." });
    }
});

router.patch("/structures/:id", requirePayrollManager, async (req, res) => {
    if (!validId(req.params.id)) {
        return res.status(400).json({ success: false, message: "Choose a valid salary structure." });
    }
    const validation = validateSalaryStructure(req.body || {}, { partial: true });
    if (validation.error || !Object.keys(validation.updates || {}).length) {
        return res.status(400).json({
            success: false,
            message: validation.error || "Provide at least one salary structure field to update."
        });
    }
    try {
        const structure = await SalaryStructure.findOne({
            _id: req.params.id,
            organization: req.user.organization
        });
        if (!structure) {
            return res.status(404).json({ success: false, message: "Salary structure not found." });
        }
        const updatedValues = {
            baseSalary: validation.updates.baseSalary ?? structure.baseSalary,
            allowances: validation.updates.allowances ?? structure.allowances,
            deductions: validation.updates.deductions ?? structure.deductions
        };
        try {
            calculatePayroll(updatedValues);
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
        Object.assign(structure, validation.updates);
        await structure.save();
        return res.json({ success: true, structure });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: "A salary structure with this name already exists." });
        }
        console.error("Update salary structure error:", error);
        return res.status(500).json({ success: false, message: "Unable to update the salary structure." });
    }
});

router.get("/employees", requirePayrollManager, async (req, res) => {
    try {
        const employees = await User.find({
            organization: req.user.organization,
            status: "active",
            role: { $in: payrollRoles }
        })
            .select("fullName email employeeId role designation department salaryStructure")
            .populate("department", "name")
            .populate("salaryStructure", "name baseSalary currency active")
            .sort({ fullName: 1 })
            .lean();
        return res.json({ success: true, employees });
    } catch (error) {
        console.error("List payroll employees error:", error);
        return res.status(500).json({ success: false, message: "Unable to load payroll employees." });
    }
});

router.put("/employees/:employeeId/structure", requirePayrollManager, async (req, res) => {
    const { employeeId } = req.params;
    const { salaryStructureId } = req.body || {};
    if (!validId(employeeId)) {
        return res.status(400).json({ success: false, message: "Choose a valid employee." });
    }
    if (salaryStructureId !== null && !validId(salaryStructureId)) {
        return res.status(400).json({ success: false, message: "Choose a valid salary structure or null to unassign it." });
    }
    try {
        let structure = null;
        if (salaryStructureId) {
            structure = await SalaryStructure.findOne({
                _id: salaryStructureId,
                organization: req.user.organization,
                active: true
            }).select("_id");
            if (!structure) {
                return res.status(404).json({ success: false, message: "Active salary structure not found." });
            }
        }

        const employee = await User.findOne({
            _id: employeeId,
            organization: req.user.organization,
            status: "active",
            role: { $in: payrollRoles }
        });
        if (!employee) {
            return res.status(404).json({ success: false, message: "Active payroll employee not found." });
        }

        employee.salaryStructure = structure?._id || null;
        await employee.save();
        return res.json({
            success: true,
            employee: {
                id: employee._id,
                fullName: employee.fullName,
                role: employee.role,
                salaryStructure: employee.salaryStructure
            }
        });
    } catch (error) {
        console.error("Assign salary structure error:", error);
        return res.status(500).json({ success: false, message: "Unable to assign the salary structure." });
    }
});

router.post("/process", requirePayrollManager, async (req, res) => {
    const month = parsePayrollMonth(req.body?.month);
    const year = Number(req.body?.year);
    if (!month || !Number.isInteger(year) || year < 2000 || year > 2100) {
        return res.status(400).json({ success: false, message: "Choose a valid payroll month and year." });
    }

    try {
        const employees = await User.find({
            organization: req.user.organization,
            status: "active",
            role: { $in: payrollRoles }
        }).populate({
            path: "salaryStructure",
            match: { organization: req.user.organization, active: true }
        });

        const assignedEmployees = employees.filter((employee) => employee.salaryStructure);
        const operations = assignedEmployees.map((employee) => {
            const totals = calculatePayroll(employee.salaryStructure);
            return {
                updateOne: {
                    filter: {
                        organization: req.user.organization,
                        employeeId: employee._id,
                        month: month.name,
                        year
                    },
                    update: {
                        $setOnInsert: {
                            organization: req.user.organization,
                            employeeId: employee._id,
                            employeeName: employee.fullName,
                            salaryStructure: employee.salaryStructure._id,
                            salaryStructureName: employee.salaryStructure.name,
                            currency: employee.salaryStructure.currency,
                            month: month.name,
                            year,
                            ...totals,
                            status: "Processed",
                            processedBy: req.user.userId
                        }
                    },
                    upsert: true
                }
            };
        });

        const result = operations.length
            ? await Payroll.bulkWrite(operations, { ordered: false })
            : { upsertedCount: 0 };
        const employeeIds = assignedEmployees.map((employee) => employee._id);
        const payroll = employeeIds.length
            ? await Payroll.find({
                organization: req.user.organization,
                employeeId: { $in: employeeIds },
                month: month.name,
                year
            }).populate("employeeId", "fullName employeeId role").sort({ employeeName: 1 }).lean()
            : [];

        return res.status(200).json({
            success: true,
            month: month.name,
            year,
            processedCount: result.upsertedCount || 0,
            skippedCount: employees.length - assignedEmployees.length,
            skippedEmployees: employees
                .filter((employee) => !employee.salaryStructure)
                .map((employee) => ({ id: employee._id, fullName: employee.fullName })),
            payroll
        });
    } catch (error) {
        console.error("Process payroll error:", error);
        return res.status(500).json({ success: false, message: "Unable to process payroll." });
    }
});

router.get("/", async (req, res) => {
    try {
        const filter = { organization: req.user.organization };
        if (req.user.role !== "admin" && !req.user.isHiringDepartment) {
            filter.employeeId = req.user.userId;
        }
        const payroll = await Payroll.find(filter)
            .populate("employeeId", "fullName employeeId role")
            .sort({ year: -1, month: -1, createdAt: -1 })
            .lean();
        return res.status(200).json(payroll);
    } catch (error) {
        console.error("List payroll records error:", error);
        return res.status(500).json({ success: false, message: "Unable to load payroll records." });
    }
});

router.patch("/:id/adjustments", requirePayrollManager, async (req, res) => {
    if (!validId(req.params.id)) {
        return res.status(400).json({ success: false, message: "Choose a valid payroll record." });
    }
    const body = req.body || {};
    const allowedFields = ["basicSalary", "earnings", "deductionItems"];
    if (!Object.keys(body).length || Object.keys(body).some((field) => !allowedFields.includes(field))) {
        return res.status(400).json({
            success: false,
            message: "Provide one or more valid payroll adjustment fields."
        });
    }

    let basicSalary;
    if (body.basicSalary !== undefined) {
        basicSalary = Number(body.basicSalary);
        if (!Number.isFinite(basicSalary) || basicSalary < 0) {
            return res.status(400).json({ success: false, message: "Basic salary must be a non-negative amount." });
        }
        basicSalary = Math.round(basicSalary * 100) / 100;
    }
    const earningsResult = body.earnings === undefined
        ? null
        : validateComponents(body.earnings, "Earnings");
    const deductionsResult = body.deductionItems === undefined
        ? null
        : validateComponents(body.deductionItems, "Deductions");
    if (earningsResult?.error || deductionsResult?.error) {
        return res.status(400).json({
            success: false,
            message: earningsResult?.error || deductionsResult.error
        });
    }

    try {
        const record = await Payroll.findOne({
            _id: req.params.id,
            organization: req.user.organization
        });
        if (!record) {
            return res.status(404).json({ success: false, message: "Payroll record not found." });
        }
        if (record.status === "Paid") {
            return res.status(409).json({ success: false, message: "Paid payroll records cannot be adjusted." });
        }
        const updatedEarnings = earningsResult?.components ?? record.earnings;
        const updatedDeductions = deductionsResult?.components ?? record.deductionItems;
        const updatedBasicSalary = basicSalary ?? record.basicSalary;
        const netBeforeRounding = updatedBasicSalary
            + updatedEarnings.reduce((total, item) => total + item.amount, 0)
            - updatedDeductions.reduce((total, item) => total + item.amount, 0);
        if (netBeforeRounding < 0) {
            return res.status(400).json({
                success: false,
                message: "Total deductions cannot exceed base salary and allowances."
            });
        }
        const totals = calculatePayroll({
            baseSalary: updatedBasicSalary,
            allowances: updatedEarnings,
            deductions: updatedDeductions
        });
        record.basicSalary = totals.basicSalary;
        record.allowances = totals.allowances;
        record.earnings = totals.earnings;
        record.deductions = totals.deductions;
        record.deductionItems = totals.deductionItems;
        record.netSalary = totals.netSalary;
        await record.save();
        return res.json({ success: true, payroll: record });
    } catch (error) {
        console.error("Adjust payroll record error:", error);
        return res.status(500).json({ success: false, message: "Unable to adjust payroll record." });
    }
});

router.patch("/:id/status", requirePayrollManager, async (req, res) => {
    if (!validId(req.params.id)) {
        return res.status(400).json({ success: false, message: "Choose a valid payroll record." });
    }
    if (!["Processed", "Paid"].includes(req.body?.status)) {
        return res.status(400).json({ success: false, message: "Status must be Processed or Paid." });
    }
    try {
        const record = await Payroll.findOne({
            _id: req.params.id,
            organization: req.user.organization
        });
        if (!record) {
            return res.status(404).json({ success: false, message: "Payroll record not found." });
        }
        const transitions = { Pending: ["Processed"], Processed: ["Paid"], Paid: [] };
        if (!transitions[record.status]?.includes(req.body.status)) {
            return res.status(409).json({ success: false, message: `Payroll cannot move from ${record.status} to ${req.body.status}.` });
        }
        record.status = req.body.status;
        if (req.body.status === "Paid") record.paymentDate = new Date();
        await record.save();
        return res.json({ success: true, payroll: record });
    } catch (error) {
        console.error("Update payroll status error:", error);
        return res.status(500).json({ success: false, message: "Unable to update payroll status." });
    }
});

router.get("/:id", async (req, res) => {
    if (!validId(req.params.id)) {
        return res.status(400).json({ success: false, message: "Choose a valid payroll record." });
    }
    try {
        const filter = { _id: req.params.id, organization: req.user.organization };
        if (req.user.role !== "admin" && !req.user.isHiringDepartment) {
            filter.employeeId = req.user.userId;
        }
        const payroll = await Payroll.findOne(filter)
            .populate("employeeId", "fullName employeeId role")
            .lean();
        if (!payroll) {
            return res.status(404).json({ success: false, message: "Payroll record not found." });
        }
        return res.status(200).json(payroll);
    } catch (error) {
        console.error("Load payroll record error:", error);
        return res.status(500).json({ success: false, message: "Unable to load the payroll record." });
    }
});

module.exports = router;
