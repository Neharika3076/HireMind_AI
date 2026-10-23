
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  requireAuth,
  authorizeRoles
} = require("../middleware/auth");

const router = express.Router();

// Redirect users according to their role
function dashboardForRole(role) {
  switch (role) {
    case "admin":
      return "/admin/dashboard";

    case "recruiter":
      return "/recruiter/dashboard";

    case "hr":
      return "/hr/dashboard";

    case "manager":
      return "/manager/dashboard";

    case "employee":
    default:
      return "/employee/dashboard";
  }
}

// Escape special characters in a regular expression
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ==========================================
// POST /api/auth/login
// Login using email, employee ID, or full name
// ==========================================
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body || {};

    if (
      typeof identifier !== "string" ||
      typeof password !== "string" ||
      !identifier.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter your login details."
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing.");

      return res.status(500).json({
        success: false,
        message: "Server authentication is not configured."
      });
    }

    const value = identifier.trim();
    const normalized = value.toLowerCase();

    const conditions = [
      { email: normalized },
      { fullName: new RegExp(`^${escapeRegex(value)}$`, "i") },
      { employeeId: value }
    ];

    // Allow MongoDB ObjectId as an identifier
    if (/^[a-f\d]{24}$/i.test(value)) {
      conditions.push({ _id: value });
    }

    const user = await User.findOne({
      $or: conditions
    }).select("+password");

    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid login credentials."
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Password is Incorrect."
      });
    }

    // Create JWT after verifying credentials
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
        organization: user.organization
          ? user.organization.toString()
          : null
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Store the token in an HTTP-only cookie
    res.cookie("terrahire_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/"
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      dashboardPath: dashboardForRole(user.role),
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        employeeId: user.employeeId,
        role: user.role,
        organization: user.organization
      }
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to log in right now."
    });
  }
});

// ==========================================
// GET /api/auth/me
// Get the currently authenticated user
// ==========================================
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select(
        "fullName email employeeId role organization designation position status department manager"
      )
      .populate("department", "name description")
      .populate("manager", "fullName email");

    if (!user) {
      res.clearCookie("terrahire_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
      });

      return res.status(401).json({
        success: false,
        message: "Account not found. Please log in again."
      });
    }

    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error("Profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve your account."
    });
  }
});

// ==========================================
// POST /api/auth/logout
// Log out the current user
// ==========================================
router.post("/logout", (req, res) => {
  res.clearCookie("terrahire_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully."
  });
});

// ==========================================
// GET /api/auth/admin-only
// Example: only authenticated admins can access
// ==========================================
router.get(
  "/admin-only",
  requireAuth,
  authorizeRoles("admin"),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Welcome, Admin!",
      user: req.user
    });
  }
);

module.exports = router;
