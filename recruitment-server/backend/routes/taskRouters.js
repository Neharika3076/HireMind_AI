
const express = require("express");
const mongoose = require("mongoose");
const Task = require("../models/Task");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// All task routes require login and an organization
router.use(requireAuth);

router.use((req, res, next) => {
  if (
    !req.user.organization ||
    !mongoose.isValidObjectId(req.user.organization)
  ) {
    return res.status(403).json({
      success: false,
      message: "Your account is not assigned to an organization."
    });
  }

  next();
});

// GET: Fetch all tasks for the logged-in user's organization
router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find({
      organization: req.user.organization
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error("Fetch tasks error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch tasks."
    });
  }
});

// POST: Create a task
router.post("/", async (req, res) => {
  try {
    const {
      project,
      title,
      team,
      manager,
      lead,
      member,
      priority,
      due,
      progress,
      status,
      description,
      category
    } = req.body;

    if (
      typeof project !== "string" ||
      !project.trim() ||
      typeof title !== "string" ||
      !title.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Project and task title are required."
      });
    }

    const task = await Task.create({
      organization: req.user.organization,
      project: project.trim(),
      title: title.trim(),
      team,
      manager,
      lead,
      member,
      priority,
      due,
      progress,
      status,
      description,
      category
    });

    return res.status(201).json({
      success: true,
      message: "Task created successfully.",
      task
    });
  } catch (error) {
    console.error("Create task error:", error.message);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create task."
    });
  }
});

// PATCH: Update a task's status
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID."
      });
    }

    const allowedStatuses = [
      "Assigned",
      "In Progress",
      "Pending Review",
      "Completed"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task status."
      });
    }

    const progressByStatus = {
      "Assigned": 0,
      "In Progress": 50,
      "Pending Review": 90,
      "Completed": 100
    };

    const task = await Task.findOneAndUpdate(
      {
        _id: id,
        organization: req.user.organization
      },
      {
        $set: {
          status,
          progress: progressByStatus[status]
        }
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found in your organization."
      });
    }

    return res.json({
      success: true,
      message: "Task status updated successfully.",
      task
    });
  } catch (error) {
    console.error("Update task status error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update task status."
    });
  }
});

module.exports = router;
