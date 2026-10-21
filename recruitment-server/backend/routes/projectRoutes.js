
const express = require("express");
const mongoose = require("mongoose");
const Project = require("../models/Project");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Require login for all project routes
router.use(requireAuth);

// Ensure the logged-in user belongs to an organization
router.use((req, res, next) => {
  if (
    !req.user.organization ||
    !mongoose.isValidObjectId(req.user.organization)
  ) {
    return res.status(403).json({
      success: false,
      message: "Your account is not assigned to an organization.",
    });
  }

  next();
});

// GET: Fetch projects for the logged-in user's organization
router.get("/", async (req, res) => {
  try {
    const projects = await Project.find({
      organization: req.user.organization,
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("Fetch projects error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch projects.",
    });
  }
});

// POST: Create a project

router.post("/", async (req, res) => {
  try {
    const {
      name,
      code,
      department,
      description,
      start,
      due,
      progress,
      status,
      members,
      color,
      teamMembers,
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof code !== "string" ||
      !code.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Project name and code are required.",
      });
    }

    const project = await Project.create({
      organization: req.user.organization,
      name: name.trim(),
      code: code.trim(),
      department:
        typeof department === "string" ? department.trim() : "Engineering",
      description:
        typeof description === "string" ? description.trim() : "",
      start: typeof start === "string" ? start : "",
      due: typeof due === "string" ? due : "",
      progress: progress ?? 0,
      status: status || "Assigned",
      members: members ?? 0,
      color: color || "teal",
      teamMembers: Array.isArray(teamMembers) ? teamMembers : [],
    });

    return res.status(201).json({
      success: true,
      message: "Project created successfully.",
      project,
    });
  } catch (error) {
    console.error("Create project error:", error.message);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create project.",
    });
  }
});


module.exports = router;
