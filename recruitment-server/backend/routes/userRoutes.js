const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Department = require("../models/Department");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Only admins can perform admin-only actions.
function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Administrator access required.",
    });
  }

  next();
}

// GET /api/users
// Admin: list users belonging to their organization.

 // GET /api/users
// Admins can list organization users.
// Executives can list managers in their own department.
router.get("/", requireAuth, async (req, res) => {
  try {
    const role = String(req.user.role || "").toLowerCase();

    let query = {
      organization: req.user.organization,
    };

    if (role === "executive") {
      // Find the executive's department from their database record.
      const executive = await User.findById(req.user.userId)
        .select("organization department role");

      if (!executive) {
        return res.status(404).json({
          success: false,
          message: "Executive account not found.",
        });
      }

      if (String(executive.role).toLowerCase() !== "executive") {
        return res.status(403).json({
          success: false,
          message: "Not authorized to view team members.",
        });
      }

      query = {
        organization: executive.organization,
        department: executive.department,
        role: "manager",
      };
    } else if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view team members.",
      });
    }

    const users = await User.find(query)
      .select(
        "fullName email employeeId role designation position department manager status organization createdAt"
      )
      .populate("department", "name description")
      .populate("manager", "fullName");

    return res.json({ success: true, users });
  } catch (error) {
    console.error("List users error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load organization users.",
    });
  }
});

// POST /api/users
// Admin: create an organization account in the reporting hierarchy.
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
  fullName,
  email,
  password,
  department,
  designation = "",
  position = "",
  manager = "",
} = req.body;

const role = String(req.body.role || "employee")
  .trim()
  .toLowerCase();

    if (
      typeof fullName !== "string" ||
      !fullName.trim() ||
      typeof email !== "string" ||
      !email.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required.",
      });
    }

    const allowedRoles = [

      "admin",

      "hr",
      "executive",
      "manager",
      "employee",
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be admin, executive, manager, or employee.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered.",
      });
    }

    let departmentDoc = null;
    if (department) {
      departmentDoc = await Department.findOne({ _id: department, organization: req.user.organization });
      if (!departmentDoc) return res.status(400).json({ success: false, message: "Select a valid department." });
    }
    if (role !== "admin" && !departmentDoc) {
      return res.status(400).json({ success: false, message: "Select a department for this account." });
    }
    let managerDoc = null;
    if (role !== "admin" && !manager) {
      return res.status(400).json({
        success: false,
        message: "Select a manager in the organization hierarchy."
      });
    }

if (manager) {
const allowedManagerRoles = {
  executive: ["admin"],
  hr: ["admin"],
  manager: ["executive"],
  employee: ["manager"],
}[role];

if (!allowedManagerRoles) {
  return res.status(400).json({
    success: false,
    message: "This account role cannot report to another member.",
  });
}

const managerDoc = await User.findOne({
  _id: manager,
  organization: req.user.organization,
  role: { $in: allowedManagerRoles },
});

if (!managerDoc) {
  return res.status(400).json({
    success: false,
    message:
      "Selected manager is invalid. Choose someone with an allowed role in your organization.",
  });
}


}


    if (password && password.length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
    // Accept an admin-provided password; otherwise generate a temporary one.
    const temporaryPassword = password || crypto.randomBytes(9).toString("base64url");
    const employeeId = `EMP-${crypto.randomBytes(5)
      .toString("hex")
      .toUpperCase()}`;

    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    const user = await User.create({
      employeeId,
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
      department: departmentDoc?._id || null,
      manager: managerDoc?._id || null,
      designation: String(designation || "").trim(),
      position: String(position || "").trim(),
      organization: req.user.organization,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      user: {
        id: user._id,
        employeeId: user.employeeId,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        designation: user.designation,
        position: user.position,
        department: user.department,
        manager: user.manager,
        status: user.status,
        organization: user.organization,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "The email or employee ID is already in use. Please retry.",
      });
    }

    console.error("Create user error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create the account.",
    });
  }
});

// GET /api/users/me
// Any authenticated user: return their own profile only.
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select("fullName email employeeId role organization department designation position status createdAt").populate("department", "name");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    return res.json({ success: true, user });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load your profile.",
    });
  }
});

module.exports = router;