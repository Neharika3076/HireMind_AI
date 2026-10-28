
const express = require("express");
const bcrypt = require("bcryptjs");
const Organization = require("../models/Organization");
const Department = require("../models/Department");
const User = require("../models/User");

const router = express.Router();

// POST /api/organizations/register
router.post("/register", async (req, res) => {
  let organization;
  let admin;

  try {
    const {
      organizationName,
      organizationCode,
      adminName,
      adminEmail,
      password
    } = req.body;

    if (
      ![organizationName, organizationCode, adminName, adminEmail, password]
        .every(value => typeof value === "string" && value.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Please complete all required fields."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters."
      });
    }

    const cleanName = organizationName.trim();
    const cleanCode = organizationCode.trim().toUpperCase();
    const cleanAdminName = adminName.trim();
    const cleanEmail = adminEmail.trim().toLowerCase();

    const existingOrg = await Organization.findOne({
      organizationCode: cleanCode
    });

    if (existingOrg) {
      return res.status(409).json({
        success: false,
        message: "This organization code is already registered."
      });
    }

    const existingUser = await User.findOne({
      email: cleanEmail
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create the organization and its first admin account.
    organization = await Organization.create({
      organizationName: cleanName,
      organizationCode: cleanCode
    });

    admin = await User.create({
      fullName: cleanAdminName,
      email: cleanEmail,
      password: hashedPassword,
      role: "admin",
      organization: organization._id
    });

    await Department.create({
      name: "HR & Hiring",
      description: "Human resources and recruitment",
      organization: organization._id,
      createdBy: admin._id
    });

    return res.status(201).json({
      success: true,
      message: "Organization registered successfully.",
      redirectTo: "/login"
    });
  } catch (error) {
    // Basic cleanup if the admin account fails after organization creation.
    if (admin?._id) {
      await User.deleteOne({ _id: admin._id }).catch((cleanupError) => {
        console.error("Organization registration admin cleanup error:", cleanupError);
      });
    }
    if (organization?._id) {
      await Organization.deleteOne({ _id: organization._id })
        .catch((cleanupError) => {
          console.error("Organization registration cleanup error:", cleanupError);
        });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "The organization code or email is already in use."
      });
    }

    console.error("Organization registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to register the organization right now."
    });
  }
});

module.exports = router;
