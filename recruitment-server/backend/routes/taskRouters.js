
const express = require("express");
const mongoose = require("mongoose");
const Task = require("../models/Task");
const { requireAuth, isHiringDepartmentName } = require("../middleware/auth");

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
      member,
      assignedTo,
      priority,
      due,
      progress,
      status,
      description,
      category,
      lead,
      manager,
    } = req.body;

    if (
      typeof project !== "string" ||
      !project.trim() ||
      typeof title !== "string" ||
      !title.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Project and task title are required.",
      });
    }

    // Get the project from this user's organization.
    const projectRecord = await Project.findOne({
      name: project.trim(),
      organization: req.user.organization,
    }).select("_id name department organization");

    if (!projectRecord) {
      return res.status(400).json({
        success: false,
        message: "Select a valid project from your organization.",
      });
    }

    if (!projectRecord.department) {
      return res.status(400).json({
        success: false,
        message: "The selected project has no department assigned.",
      });
    }

    // The project's department is authoritative.
    const departmentId = projectRecord.department;

    // Support either frontend field while we transition.
    const assignedUserId = assignedTo || member || "";

    let assignedUser = null;

    if (
      assignedUserId &&
      assignedUserId !== "Unassigned"
    ) {
      if (!mongoose.isValidObjectId(assignedUserId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assigned member.",
        });
      }

      assignedUser = await User.findOne({
        _id: assignedUserId,
        organization: req.user.organization,
        department: departmentId,
        status: "active",
      }).select("_id fullName email role department organization");

      if (!assignedUser) {
        return res.status(400).json({
          success: false,
          message:
            "The assigned member must be an active user in this project's department.",
        });
      }
    }

    // Load the creator so we can check department permissions.
    const creator = await User.findOne({
      _id: req.user.userId,
      organization: req.user.organization,
    }).select("_id role department organization");

    if (!creator) {
      return res.status(401).json({
        success: false,
        message: "Your user account could not be found.",
      });
    }

    const role = String(creator.role || "").toLowerCase();

if (role === "executive") {
  if (!assignedUser) {
    return res.status(400).json({
      success: false,
      message: "Please select a Manager to assign this task.",
    });
  }

  if (String(assignedUser.role || "").toLowerCase() !== "manager") {
    return res.status(403).json({
      success: false,
      message: "Executives can assign tasks only to Managers.",
    });
  }
}
    // HR can view task statistics but cannot create tasks.
    if (role === "hr") {
      return res.status(403).json({
        success: false,
        message: "HR has read-only access to tasks."
      });
    }



    // Department-assigned admins and HR can create tasks only
    // for their own department. An admin with no department
    // remains an organization-wide admin.
    if (
      (role === "hr" || (role === "admin" && creator.department)) &&
      String(creator.department) !== String(departmentId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can only create tasks for your own department.",
      });
    }

    const task = await Task.create({
      organization: req.user.organization,
      project: projectRecord.name,
      title: title.trim(),
      department: departmentId,

      // Keep legacy fields for compatibility with existing UI.
      team: (await Department.findById(departmentId).select("name"))?.name
        || "Unassigned",
      manager: manager || "Unassigned",
      lead: lead || "Unassigned",
      member: assignedUser ? String(assignedUser._id) : "Unassigned",

      // Store actual User references.
      assignedTo: assignedUser ? assignedUser._id : null,
      createdBy: creator._id,

      priority: ["Critical", "High", "Medium", "Low"].includes(priority)
        ? priority
        : "High",
      due: due || "",
      progress: Number.isFinite(Number(progress))
        ? Math.max(0, Math.min(100, Number(progress)))
        : 0,
      status: [
        "Assigned",
        "In Progress",
        "Pending Review",
        "Completed",
      ].includes(status)
        ? status
        : "Assigned",
      description: description || "",
      category: category || "",
    });

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "fullName email role")
      .populate("createdBy", "fullName email role")
      .populate("department", "name");

    return res.status(201).json({
      success: true,
      message: "Task created successfully.",
      task: populatedTask,
    });
  } catch (error) {
    console.error("Create task error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create task.",
    });
  }
});

// PATCH: Update a task's status
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const currentUser = await User.findOne({
  _id: req.user.userId,
  organization: req.user.organization
}).select("role");

if (!currentUser) {
  return res.status(401).json({
    success: false,
    message: "User account not found."
  });
}



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


    

const normalizedRole = String(currentUser.role || "").toLowerCase();

const taskFilter = {
  _id: id,
  organization: req.user.organization,
};

// HR can update only a task assigned to their own account.
if (normalizedRole === "hr") {
  taskFilter.assignedTo = currentUser._id;
}

const task = await Task.findOneAndUpdate(
  taskFilter,
  {
    $set: {
      status,
      progress: progressByStatus[status],
    },
  },
  {
    new: true,
    runValidators: true,
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
    .select("role department manager organization")
    .populate("department", "name");

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
  // Organization-wide admin sees all tasks.
// An admin assigned to a department sees that department only.
  if (currentUser.role === "admin") {
    if (currentUser.department) {
      return {
        organization,
        department: currentUser.department,
      };
    }

    return { organization };
  }
  // HR sees only tasks assigned to their own account.
if (String(currentUser.role || "").toLowerCase() === "hr") {
  return {
    organization,
    assignedTo: currentUser._id,
  };
}

  // HR & Hiring department members: tasks in their own department
  if (isHiringDepartmentName(currentUser.department?.name)) {
    if (!currentUser.department) {
      return {
        organization,
        _id: { $exists: false }
      };
    }

    return {
      organization,
      department: currentUser.department._id
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
    .populate("assignedTo", "fullName email role")
    .populate("createdBy", "fullName email role")
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
