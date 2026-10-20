const express = require("express");
const mongoose = require("mongoose");

const Attendance = require("../models/Attendance");
const LeaveMonthBalance = require("../models/LeaveMonthBalance");
const LeaveRequest = require("../models/LeaveRequest");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const { countDaysByMonth, listDateKeys, isValidDateKey } = require("../utils/attendanceDate");

const router = express.Router();
const MONTHLY_LEAVE_LIMIT = 3;

function requireOrganization(req, res, next) {
  if (!req.user.organization || !mongoose.isValidObjectId(req.user.organization)) {
    return res.status(403).json({
      success: false,
      message: "Your account is not assigned to an organization."
    });
  }
  next();
}

function getMonthBounds(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return {
    first: `${monthKey}-01`,
    last: `${year}-${String(month).padStart(2, "0")}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0")}`
  };
}

async function getApprovedDaysByMonth(organization, userId, monthKeys) {
  if (!monthKeys.length) return new Map();
  const bounds = monthKeys.map(getMonthBounds);
  const startDateKey = bounds.reduce((earliest, item) => item.first < earliest ? item.first : earliest, bounds[0].first);
  const endDateKey = bounds.reduce((latest, item) => item.last > latest ? item.last : latest, bounds[0].last);
  const approved = await LeaveRequest.find({
    organization,
    user: userId,
    status: "approved",
    startDateKey: { $lte: endDateKey },
    endDateKey: { $gte: startDateKey }
  }).select("startDateKey endDateKey").lean();

  const counts = new Map();
  for (const leave of approved) {
    for (const dateKey of listDateKeys(leave.startDateKey, leave.endDateKey)) {
      const monthKey = dateKey.slice(0, 7);
      if (monthKeys.includes(monthKey)) counts.set(monthKey, (counts.get(monthKey) || 0) + 1);
    }
  }
  return counts;
}

async function checkLeaveLimit(organization, userId, dateKeys) {
  const requestedByMonth = countDaysByMonth(dateKeys);
  for (const [monthKey, days] of requestedByMonth) {
    if (days > MONTHLY_LEAVE_LIMIT) {
      return `Leave requests may not exceed ${MONTHLY_LEAVE_LIMIT} calendar days in ${monthKey}.`;
    }
  }

  const currentCounts = await getApprovedDaysByMonth(organization, userId, [...requestedByMonth.keys()]);
  for (const [monthKey, days] of requestedByMonth) {
    if ((currentCounts.get(monthKey) || 0) + days > MONTHLY_LEAVE_LIMIT) {
      return `This approval would exceed the ${MONTHLY_LEAVE_LIMIT}-day leave limit for ${monthKey}.`;
    }
  }
  return null;
}

async function releaseLeaveDays(organization, userId, reservations) {
  for (const reservation of reservations) {
    await LeaveMonthBalance.updateOne(
      { organization, user: userId, monthKey: reservation.monthKey },
      { $inc: { daysUsed: -reservation.days } }
    );
  }
}

async function reserveLeaveDays(organization, userId, dateKeys) {
  const requestedByMonth = countDaysByMonth(dateKeys);
  const existingCounts = await getApprovedDaysByMonth(
    organization,
    userId,
    [...requestedByMonth.keys()]
  );
  const reservations = [];

  try {
    for (const [monthKey, days] of requestedByMonth) {
      if (days > MONTHLY_LEAVE_LIMIT) {
        const error = new Error(`Leave requests may not exceed ${MONTHLY_LEAVE_LIMIT} calendar days in ${monthKey}.`);
        error.statusCode = 409;
        throw error;
      }

      try {
        await LeaveMonthBalance.create({
          organization,
          user: userId,
          monthKey,
          daysUsed: existingCounts.get(monthKey) || 0
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
      }

      const balance = await LeaveMonthBalance.findOneAndUpdate(
        {
          organization,
          user: userId,
          monthKey,
          daysUsed: { $lte: MONTHLY_LEAVE_LIMIT - days }
        },
        { $inc: { daysUsed: days } },
        { new: true, runValidators: true }
      );
      if (!balance) {
        const error = new Error(`This approval would exceed the ${MONTHLY_LEAVE_LIMIT}-day leave limit for ${monthKey}.`);
        error.statusCode = 409;
        throw error;
      }
      reservations.push({ monthKey, days });
    }
    return reservations;
  } catch (error) {
    await releaseLeaveDays(organization, userId, reservations);
    throw error;
  }
}

async function hasAttendanceConflict(organization, userId, startDateKey, endDateKey) {
  return Attendance.exists({
    organization,
    user: userId,
    dateKey: { $gte: startDateKey, $lte: endDateKey }
  });
}

router.use(requireAuth, requireOrganization);

router.get("/", async (req, res) => {
  try {
    let filter;
    if (req.user.role === "admin") {
      filter = { organization: req.user.organization };
    } else if (req.user.role === "hr") {
      const employees = await User.find({
        organization: req.user.organization,
        role: "employee",
        status: "active"
      }).select("_id").lean();
      filter = {
        organization: req.user.organization,
        $or: [
          { user: req.user.userId },
          { user: { $in: employees.map((employee) => employee._id) }, status: "pending" }
        ]
      };
    } else {
      filter = { organization: req.user.organization, user: req.user.userId };
    }

    const requests = await LeaveRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("user", "fullName email employeeId role department")
      .populate("reviewedBy", "fullName")
      .lean();
    return res.json({ success: true, requests });
  } catch (error) {
    console.error("List leave requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load leave requests."
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const { startDateKey, endDateKey, reason } = req.body || {};
    if (!isValidDateKey(startDateKey) || !isValidDateKey(endDateKey) || startDateKey > endDateKey) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid leave start and end date."
      });
    }
    if (typeof reason !== "string" || !reason.trim() || reason.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: "A reason of up to 1,000 characters is required."
      });
    }

    const dateKeys = listDateKeys(startDateKey, endDateKey);
    if (dateKeys.length > 366) {
      return res.status(400).json({
        success: false,
        message: "A single leave request cannot be longer than 366 calendar days."
      });
    }
    const overlappingRequest = await LeaveRequest.exists({
      organization: req.user.organization,
      user: req.user.userId,
      status: { $in: ["pending", "approved"] },
      startDateKey: { $lte: endDateKey },
      endDateKey: { $gte: startDateKey }
    });
    if (overlappingRequest) {
      return res.status(409).json({
        success: false,
        message: "You already have a pending or approved request for one or more of those dates."
      });
    }

    const isAdmin = req.user.role === "admin";
    const limitError = await checkLeaveLimit(req.user.organization, req.user.userId, dateKeys);
    if (limitError) {
      return res.status(409).json({ success: false, message: limitError });
    }
    if (await hasAttendanceConflict(req.user.organization, req.user.userId, startDateKey, endDateKey)) {
      return res.status(409).json({
        success: false,
        message: "Leave cannot be requested for a date with recorded attendance."
      });
    }

    const reservations = isAdmin
      ? await reserveLeaveDays(req.user.organization, req.user.userId, dateKeys)
      : [];
    let request;
    try {
      request = await LeaveRequest.create({
        organization: req.user.organization,
        user: req.user.userId,
        startDateKey,
        endDateKey,
        reason: reason.trim(),
        status: isAdmin ? "approved" : "pending",
        reviewedBy: isAdmin ? req.user.userId : null,
        decidedAt: isAdmin ? new Date() : null
      });
    } catch (error) {
      if (reservations.length) {
        await releaseLeaveDays(req.user.organization, req.user.userId, reservations);
      }
      throw error;
    }
    const populated = await LeaveRequest.findById(request._id)
      .populate("user", "fullName email employeeId role department")
      .populate("reviewedBy", "fullName")
      .lean();
    return res.status(201).json({
      success: true,
      message: isAdmin ? "Your leave was approved and recorded." : "Your leave request was submitted.",
      request: populated
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error("Create leave request error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to submit the leave request."
    });
  }
});

router.post("/:id/decision", async (req, res) => {
  try {
    if (!["admin", "hr"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only HR and administrators can review leave requests."
      });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid leave request." });
    }
    const { decision } = req.body || {};
    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: "Choose approve or reject."
      });
    }

    const leave = await LeaveRequest.findOne({
      _id: req.params.id,
      organization: req.user.organization,
      status: "pending"
    }).lean();
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Pending leave request not found."
      });
    }
    if (req.user.role === "hr") {
      const employee = await User.exists({
        _id: leave.user,
        organization: req.user.organization,
        role: "employee",
        status: "active"
      });
      if (!employee) {
        return res.status(403).json({
          success: false,
          message: "HR can review employee leave requests only. An administrator must review HR leave."
        });
      }
    }

    if (decision === "approved") {
      if (await hasAttendanceConflict(req.user.organization, leave.user, leave.startDateKey, leave.endDateKey)) {
        return res.status(409).json({
          success: false,
          message: "Leave cannot be approved for dates with recorded attendance."
        });
      }
      const dateKeys = listDateKeys(leave.startDateKey, leave.endDateKey);
      const limitError = await checkLeaveLimit(req.user.organization, leave.user, dateKeys);
      if (limitError) {
        return res.status(409).json({ success: false, message: limitError });
      }
    }

    const reservations = decision === "approved"
      ? await reserveLeaveDays(req.user.organization, leave.user, listDateKeys(leave.startDateKey, leave.endDateKey))
      : [];
    let updated;
    try {
      updated = await LeaveRequest.findOneAndUpdate(
        { _id: leave._id, organization: req.user.organization, status: "pending" },
        {
          $set: {
            status: decision,
            reviewedBy: req.user.userId,
            decidedAt: new Date()
          }
        },
        { new: true, runValidators: true }
      )
        .populate("user", "fullName email employeeId role department")
        .populate("reviewedBy", "fullName")
        .lean();
    } catch (error) {
      if (reservations.length) {
        await releaseLeaveDays(req.user.organization, leave.user, reservations);
      }
      throw error;
    }
    if (!updated) {
      if (reservations.length) {
        await releaseLeaveDays(req.user.organization, leave.user, reservations);
      }
      return res.status(409).json({
        success: false,
        message: "This leave request was already reviewed."
      });
    }
    return res.json({
      success: true,
      message: `Leave request ${decision}.`,
      request: updated
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error("Review leave request error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to review the leave request."
    });
  }
});

module.exports = router;
