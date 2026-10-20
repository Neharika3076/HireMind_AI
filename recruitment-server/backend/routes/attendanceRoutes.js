const express = require("express");
const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const LeaveRequest = require("../models/LeaveRequest");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const { timeZone, getDateKey, getMonthDateKeys } = require("../utils/attendanceDate");

const router = express.Router();

function requireOrganization(req, res, next) {
  if (!req.user.organization || !mongoose.isValidObjectId(req.user.organization)) {
    return res.status(403).json({
      success: false,
      message: "Your account is not assigned to an organization."
    });
  }
  next();
}

router.use(requireAuth, requireOrganization);

router.get("/today", async (req, res) => {
  try {
    const today = getDateKey();
    const orgId = req.user.organization;
    const ownRecord = await Attendance.findOne({
      organization: orgId,
      user: req.user.userId,
      dateKey: today
    }).lean();

    if (req.user.role !== "admin") {
      return res.json({
        success: true,
        dateKey: today,
        timeZone,
        ownRecord,
        items: ownRecord ? [{ ...ownRecord, user: req.user.userId }] : []
      });
    }

    const [members, allRecords] = await Promise.all([
      User.find({ organization: orgId, status: "active" })
        .select("fullName email employeeId role department")
        .populate("department", "name")
        .sort({ fullName: 1 })
        .lean(),
      Attendance.find({ organization: orgId, dateKey: today }).lean()
    ]);

    const memberIds = new Set(members.map((member) => String(member._id)));
    const records = allRecords.filter((record) => memberIds.has(String(record.user)));
    const recordByUser = new Map(records.map((record) => [String(record.user), record]));
    const items = members.map((member) => ({
      ...(recordByUser.get(String(member._id)) || {
        organization: orgId,
        user: member._id,
        dateKey: today,
        checkInAt: null,
        checkOutAt: null,
        durationSeconds: null,
        status: "not_checked_in"
      }),
      user: {
        _id: member._id,
        fullName: member.fullName,
        email: member.email,
        employeeId: member.employeeId,
        role: member.role,
        department: member.department
      }
    }));

    return res.json({
      success: true,
      dateKey: today,
      timeZone,
      ownRecord,
      items,
      summary: {
        teamMembers: members.length,
        checkedIn: records.length,
        notCheckedIn: Math.max(0, members.length - records.length),
        checkedOut: records.filter((record) => Boolean(record.checkOutAt)).length
      }
    });
  } catch (error) {
    console.error("Load attendance error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load attendance records."
    });
  }
});

router.get("/history", async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 30));
    const filter = { organization: req.user.organization };
    if (req.user.role !== "admin") filter.user = req.user.userId;

    const [total, records] = await Promise.all([
      Attendance.countDocuments(filter),
      Attendance.find(filter)
        .sort({ dateKey: -1, checkInAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);

    let items = records;
    if (req.user.role === "admin" && records.length) {
      const members = await User.find({
        organization: req.user.organization,
        _id: { $in: [...new Set(records.map((record) => String(record.user)))] }
      })
        .select("fullName email employeeId role department")
        .populate("department", "name")
        .lean();
      const memberById = new Map(members.map((member) => [String(member._id), member]));
      items = records.map((record) => ({
        ...record,
        user: memberById.get(String(record.user)) || {
          _id: record.user,
          fullName: "Former team member",
          role: "",
          department: null
        }
      }));
    } else if (req.user.role !== "admin") {
      items = records.map((record) => ({ ...record, user: req.user.userId }));
    }

    return res.json({
      success: true,
      timeZone,
      items,
      page,
      limit,
      total,
      hasMore: page * limit < total
    });
  } catch (error) {
    console.error("Load attendance history error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load attendance history."
    });
  }
});

router.get("/calendar", async (req, res) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: "Choose a valid calendar month."
      });
    }

    const dateKeys = getMonthDateKeys(year, month);
    const firstDate = dateKeys[0];
    const lastDate = dateKeys[dateKeys.length - 1];
    const [records, approvedLeaves] = await Promise.all([
      Attendance.find({
        organization: req.user.organization,
        user: req.user.userId,
        dateKey: { $gte: firstDate, $lte: lastDate }
      }).lean(),
      LeaveRequest.find({
        organization: req.user.organization,
        user: req.user.userId,
        status: "approved",
        startDateKey: { $lte: lastDate },
        endDateKey: { $gte: firstDate }
      }).select("startDateKey endDateKey").lean()
    ]);

    const attendanceByDate = new Map(records.map((record) => [record.dateKey, record]));
    const leaveDates = new Set();
    for (const leave of approvedLeaves) {
      const start = leave.startDateKey < firstDate ? firstDate : leave.startDateKey;
      const end = leave.endDateKey > lastDate ? lastDate : leave.endDateKey;
      for (let date = new Date(`${start}T00:00:00.000Z`); date <= new Date(`${end}T00:00:00.000Z`); date.setUTCDate(date.getUTCDate() + 1)) {
        leaveDates.add(date.toISOString().slice(0, 10));
      }
    }

    const now = new Date();
    const today = getDateKey(now);
    const days = dateKeys.map((dateKey) => {
      if (leaveDates.has(dateKey)) return { dateKey, status: "leave" };
      const record = attendanceByDate.get(dateKey);
      if (!record) return { dateKey, status: "unmarked" };
      if (record.checkOutAt) {
        const duration = record.durationSeconds ?? Math.floor(
          (new Date(record.checkOutAt).getTime() - new Date(record.checkInAt).getTime()) / 1000
        );
        return { dateKey, status: duration < 5 * 60 * 60 ? "half_day" : "present", record };
      }
      if (dateKey === today) {
        const elapsed = Math.max(0, Math.floor((now - new Date(record.checkInAt).getTime()) / 1000));
        return { dateKey, status: elapsed >= 5 * 60 * 60 ? "present" : "in_progress", record };
      }
      return { dateKey, status: "unmarked", record };
    });
    const summary = {
      present: days.filter((day) => day.status === "present").length,
      halfDays: days.filter((day) => day.status === "half_day").length,
      leave: days.filter((day) => day.status === "leave").length
    };
    summary.leaveRemaining = Math.max(0, 3 - summary.leave);

    return res.json({ success: true, year, month, timeZone, days, summary });
  } catch (error) {
    console.error("Load attendance calendar error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load the attendance calendar."
    });
  }
});

router.post("/check-in", async (req, res) => {
  try {
    const dateKey = getDateKey();
    const approvedLeave = await LeaveRequest.exists({
      organization: req.user.organization,
      user: req.user.userId,
      status: "approved",
      startDateKey: { $lte: dateKey },
      endDateKey: { $gte: dateKey }
    });
    if (approvedLeave) {
      return res.status(409).json({
        success: false,
        message: "You have approved leave for today and cannot check in."
      });
    }

    const checkInAt = new Date();
    try {
      const record = await Attendance.create({
        organization: req.user.organization,
        user: req.user.userId,
        dateKey,
        checkInAt,
        status: "present"
      });
      return res.status(201).json({
        success: true,
        message: "Checked in successfully.",
        record
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "You have already checked in today."
        });
      }
      throw error;
    }
  } catch (error) {
    console.error("Attendance check-in error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to record your check-in."
    });
  }
});

router.post("/check-out", async (req, res) => {
  try {
    const now = new Date();
    const filter = {
      organization: req.user.organization,
      user: req.user.userId,
      dateKey: getDateKey(now),
      checkOutAt: null
    };
    const existing = await Attendance.findOne(filter).select("checkInAt").lean();

    if (!existing) {
      const existing = await Attendance.exists({
        organization: req.user.organization,
        user: req.user.userId,
        dateKey: getDateKey(now)
      });
      return res.status(409).json({
        success: false,
        message: existing
          ? "You have already checked out today."
          : "Check in before checking out."
      });
    }

    const record = await Attendance.findOneAndUpdate(filter, {
      $set: {
        checkOutAt: now,
        durationSeconds: Math.max(0, Math.floor((now - existing.checkInAt) / 1000)),
        status: Math.max(0, Math.floor((now - existing.checkInAt) / 1000)) < 5 * 60 * 60
          ? "half_day"
          : "present"
      }
    }, { new: true, runValidators: true });
    if (!record) {
      return res.status(409).json({
        success: false,
        message: "You have already checked out today."
      });
    }

    return res.json({
      success: true,
      message: "Checked out successfully.",
      record
    });
  } catch (error) {
    console.error("Attendance check-out error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to record your check-out."
    });
  }
});

module.exports = router;
