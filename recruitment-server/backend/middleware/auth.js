
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

function isHiringDepartmentName(name) {
  return String(name || "").trim().toLowerCase() === "hr & hiring";
}

async function requireAuth(req, res, next) {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing.");

    return res.status(500).json({
      success: false,
      message: "Server authentication is not configured."
    });
  }

  const token = req.cookies?.terrahire_token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Please log in to continue."
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!mongoose.isValidObjectId(decoded.userId)) {
      throw new Error("Invalid user ID in token");
    }

    // Load the current database role instead of trusting
    // a potentially outdated role stored in the JWT.
    const user = await User.findById(decoded.userId)
      .select("_id role organization department manager status")
      .populate("department", "name");

    if (!user || user.status !== "active") {
      res.clearCookie("terrahire_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
      });

      return res.status(401).json({
        success: false,
        message: "Your account is inactive or no longer exists."
      });
    }

    req.user = {
      userId: user._id.toString(),
      role: user.role,
      organization: user.organization
        ? user.organization.toString()
        : null,
      department: user.department
        ? user.department._id.toString()
        : null,
      departmentName: user.department?.name || "",
      isHiringDepartment: isHiringDepartmentName(user.department?.name),
      manager: user.manager
        ? user.manager.toString()
        : null
    };

    return next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    res.clearCookie("terrahire_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    });

    return res.status(401).json({
      success: false,
      message: "Your session is invalid. Please log in again."
    });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please log in to continue."
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action."
      });
    }

    next();
  };
}

module.exports = {
  requireAuth,
  authorizeRoles,
  isHiringDepartmentName
};
