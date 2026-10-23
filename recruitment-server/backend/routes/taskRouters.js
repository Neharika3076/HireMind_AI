
const express = require("express");
const mongoose = require("mongoose");
const Task = require("../models/Task");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const User = require("../models/User");
const Department = require("../models/Department");
const Project = require("../models/Project");
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



router.post("/", async (req, res) => {
  try {
    const {
      project,
      title,
      department,
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

    let departmentId = null;

    if (department) {
      if (!mongoose.isValidObjectId(department)) {
        return res.status(400).json({
          success: false,
          message: "Invalid department ID."
        });
      }

      const departmentRecord = await Department.findOne({
        _id: department,
        organization: req.user.organization
      });

      if (!departmentRecord) {
        return res.status(400).json({
          success: false,
          message: "Department not found in your organization."
        });
      }

      departmentId = departmentRecord._id;
    }

    const task = await Task.create({
      organization: req.user.organization,
      project: project.trim(),
      title: title.trim(),
      department: departmentId,
      team,
      manager,
      lead,
      member,
      priority,
      due,
      progress,
      status,
      description,
      category,
      createdBy: req.user.userId
    });

    return res.status(201).json({
      success: true,
      message: "Task created successfully.",
      task
    });
  } catch (error) {
    console.error("Create task error:", error);

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


async function getTaskScope(user) {
  const currentUser = await User.findById(user.userId)
    .select("role department manager organization");

  if (!currentUser) {
    const error = new Error("User account not found.");
    error.status = 401;
    throw error;
  }

  const organization = currentUser.organization;

  if (!organization) {
    const error = new Error("Organization not assigned.");
    error.status = 403;
    throw error;
  }

  // Admin: all tasks in their organization
  if (currentUser.role === "admin") {
    return { organization };
  }

  // HR: tasks in their own department
  if (currentUser.role === "hr") {
    if (!currentUser.department) {
      return {
        organization,
        _id: { $exists: false }
      };
    }

    return {
      organization,
      department: currentUser.department
    };
  }

  // Manager: own tasks and direct reports' tasks
  if (currentUser.role === "manager") {
    const reportIds = await User.find({
      organization,
      manager: currentUser._id
    }).distinct("_id");

    return {
      organization,
      $or: [
        { assignedTo: currentUser._id },
        { assignedTo: { $in: reportIds } }
      ]
    };
  }

  // Employee, executor, and recruiter:
  // only tasks assigned to themselves
  return {
    organization,
    assignedTo: currentUser._id
  };
}

router.get("/", async (req, res) => {
  try {
    const scope = await getTaskScope(req.user);

    const tasks = await Task.find(scope)
      .populate("assignedTo", "fullName email")
      .populate("department", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error("Fetch tasks error:", error.message);

    return res.status(error.status || 500).json({
      success: false,
      message: error.status
        ? error.message
        : "Failed to fetch tasks."
    });
  }
});

module.exports = router;
