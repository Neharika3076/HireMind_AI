const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
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
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({
      organization: req.user.organization,
    }).select("fullName email employeeId role createdAt");

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
// Admin: create an employee or recruiter account.
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { fullName, email, role } = req.body;

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

    if (!["employee", "recruiter"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be employee or recruiter.",
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

    // Generate a temporary password and a unique employee ID.
    const temporaryPassword = crypto.randomBytes(9).toString("base64url");
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
      organization: req.user.organization,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      temporaryPassword,
      user: {
        id: user._id,
        employeeId: user.employeeId,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
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
      .select("fullName email employeeId role organization createdAt");

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