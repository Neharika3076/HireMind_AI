
const express = require("express");
const mongoose = require("mongoose");

const Project = require("../models/Project");
const User = require("../models/User");
const Department = require("../models/Department");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Normalize role names.
function normalizeRole(role) {
  const value = String(role || "").trim().toLowerCase();

  if (value === "executive") return "executor";

  return value;
}

// All project routes require authentication.
router.use(requireAuth);

// Ensure the user belongs to a valid organization.
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



router.get("/", async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "_id role department manager organization"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (
      !user.organization ||
      String(user.organization) !== String(req.user.organization)
    ) {
      return res.status(403).json({
        success: false,
        message: "Your organization access is invalid.",
      });
    }

    const role = normalizeRole(user.role);
    const organization = user.organization;
    const filter = { organization };

    console.log("Logged-in user role:", user.role);
    console.log("Normalized role:", role);

    if (role === "admin") {


    }
    else if (role === "manager") {
      if (!user.department) {
        return res.json({ success: true, projects: [] });
      }

      filter.department = user.department;

      filter.$or = [
        { createdBy: user._id },
        { projectManagers: user._id },
        { teamMembers: user._id },
      ];

    } else if (role === "executor") {
      const Task = require("../models/Task");
      const visibleTasks = await Task.find({
        organization,
        $or: [
          { assignedTo: user._id },
          { createdBy: user._id },
        ],
      }).select("project");

      const taskProjectNames = [
        ...new Set(
          visibleTasks
            .map((task) => String(task.project || "").trim())
            .filter(Boolean)
        ),
      ];


      filter.$or = [
        { createdBy: user._id },
        { projectManagers: user._id },
        { teamMembers: user._id },
        ...(taskProjectNames.length
          ? [{ name: { $in: taskProjectNames } }]
          : []),];
    } else if (role === "employee" || role === "hr") {

      filter.$or = [
        { createdBy: user._id },
        { teamMembers: user._id },
        { projectManagers: user._id },
      ];

    }
    else {
      console.log("Rejected project role:", user.role, role);

      return res.status(403).json({
        success: false,
        message: "You are not authorized to view projects.",
      });
    }

    const projects = await Project.find(filter)
      .populate("department", "name")
      .populate("teamMembers", "fullName email role")
      .populate("projectManagers", "fullName email role")
      .sort({ createdAt: -1 });

    const projectsWithMemberCount = projects.map((project) => {
      const item = project.toObject();

      item.members = Array.isArray(item.teamMembers)
        ? item.teamMembers.length
        : 0;

      return item;
    });

    return res.status(200).json({
      success: true,
      projects: projectsWithMemberCount,
    });
  }
  catch (error) {
    console.error("Fetch projects error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch projects.",
    });
  }
});


router.post("/", async (req, res) => {
  try {
    // if (req.user.role !== "admin" && !req.user.isHiringDepartment) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Only administrators and HR & Hiring department members can create projects."
    //   });
    // }
    
const role = normalizeRole(req.user.role);

if (
  role !== "admin" &&
  role !== "executive" &&
  !req.user.isHiringDepartment
) {
  return res.status(403).json({
    success: false,
    message: "You are not authorized to create projects."
  });
}


    const user = await User.findById(req.user.userId).select(
      "organization role"
    );

    if (
      !user ||
      !user.organization ||
      String(user.organization) !== String(req.user.organization)
    ) {
      return res.status(403).json({
        success: false,
        message: "Your organization access is invalid."
      });
    }

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
      projectManagers
    } = req.body;

    // Validate required fields.
    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof code !== "string" ||
      !code.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Project name and code are required."
      });
    }

    // Department must be a valid MongoDB ObjectId.
    if (
      typeof department !== "string" ||
      !mongoose.isValidObjectId(department)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid department."
      });
    }

    // Department must belong to this organization.
    const departmentRecord = await Department.findOne({
      _id: department,
      organization: user.organization
    }).select("_id");

    if (!departmentRecord) {
      return res.status(400).json({
        success: false,
        message: "Selected department does not exist in your organization."
      });
    }

    // Validate team member and project manager arrays.
    const validateUserIds = (ids) =>
      Array.isArray(ids) &&
      ids.every(
        (id) =>
          typeof id === "string" &&
          mongoose.isValidObjectId(id)
      );

    if (
      teamMembers !== undefined &&
      !validateUserIds(teamMembers)
    ) {
      return res.status(400).json({
        success: false,
        message: "Team members must contain valid user IDs."
      });
    }

    if (
      projectManagers !== undefined &&
      !validateUserIds(projectManagers)
    ) {
      return res.status(400).json({
        success: false,
        message: "Project managers must contain valid user IDs."
      });
    }

    const teamMemberIds = [
      ...new Set(teamMembers || [])
    ];

    const projectManagerIds = [
      ...new Set(projectManagers || [])
    ];
    const creatorRole = normalizeRole(user.role);

    if (creatorRole === "admin") {
      const departmentExecutors = await User.find({
        organization: user.organization,
        department: departmentRecord._id,
        role: { $in: ["executor", "executive"] },
        status: "active",
      }).select("_id");

      if (departmentExecutors.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "No active Executor is assigned to the selected department. Please assign an Executor first.",
        });
      }

      // Assign the first matching Executor to the project.
      const executorId = String(departmentExecutors[0]._id);

      if (!teamMemberIds.includes(executorId)) {
        teamMemberIds.push(executorId);
      }
    }


    const assignedUserIds = [
      ...new Set([...teamMemberIds, ...projectManagerIds])
    ];

    // Do not assign users from another organization.
    if (assignedUserIds.length > 0) {
      const validUsers = await User.countDocuments({
        _id: { $in: assignedUserIds },
        organization: user.organization
      });

      if (validUsers !== assignedUserIds.length) {
        return res.status(400).json({
          success: false,
          message: "One or more assigned users are invalid or outside your organization."
        });
      }
    }

    // Create project using the selected department ID.
    const project = await Project.create({
      organization: user.organization,
      name: name.trim(),
      code: code.trim(),
      department: departmentRecord._id,
      description:
        typeof description === "string"
          ? description.trim()
          : "",
      start: typeof start === "string" ? start : "",
      due: typeof due === "string" ? due : "",
      progress: progress ?? 0,
      status: status || "Assigned",
      members: teamMemberIds.length,
      color: color || "teal",
      teamMembers: teamMemberIds,
      projectManagers: projectManagerIds,
      createdBy: user._id
    });

    // Return populated department and user details.
    await project.populate([
      { path: "department", select: "name" },
      { path: "teamMembers", select: "fullName email" },
      { path: "projectManagers", select: "fullName email" }
    ]);

    return res.status(201).json({
      success: true,
      message: "Project created successfully.",
      project
    });
  } catch (error) {
    console.error("Create project error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A project with this unique value already exists."
      });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create project."
    });
  }
});

module.exports = router;
