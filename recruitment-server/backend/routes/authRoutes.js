
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function dashboardForRole(role) {
  switch (role) {
    case "admin":
      return "/admin.html";
    case "recruiter":
      return "/recruiter.html";
    default:
      return "/employee.html";
  }
}

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

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

    const value = identifier.trim();
    const normalized = value.toLowerCase();

    // Match email, full name, employee ID or MongoDB user ID.
    const conditions = [
      { email: normalized },
      { fullName: new RegExp(
          "^" + normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$",
          "i"
        )
      },
      { employeeId: value }
    ];

    if (/^[a-f\d]{24}$/i.test(value)) {
      conditions.push({ _id: value });
    }

    const user = await User.findOne({
      $or: conditions
    }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid login details."
      });
    }

   const token = jwt.sign(
  {
    userId: user._id.toString(),
    role: user.role,
    organization: user.organization
      ? user.organization.toString()
      : null,
  },
  process.env.JWT_SECRET,
  { expiresIn: "1d" }
);

    res.cookie("terrahire_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/"
    });

    return res.json({
      success: true,
      message: "Login successful.",
      user: {
        id: user._id,
        employeeId: user.employeeId,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        organization: user.organization
      },
      dashboardPath: dashboardForRole(user.role)
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to log in right now."
    });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select("fullName email employeeId role organization");

    if (!user) {
      res.clearCookie("terrahire_token");
      return res.status(401).json({
        success: false,
        message: "Account not found."
      });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to retrieve your account."
    });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie("terrahire_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });

  res.json({
    success: true,
    message: "Logged out successfully."
  });
});

module.exports = router;