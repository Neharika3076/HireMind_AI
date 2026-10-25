import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { isHiringDepartment } from "../utils/departmentAccess";
import "../styles/Tasks.css";

const emptyProject = {
  name: "",
  code: "",
  description: "",
  department: "",
  start: "",
  due: "",
};

const emptyTask = {
  project: "",
  title: "",
  priority: "High",
  description: "",
  category: "",
  due: "",
  lead: "",
  member: "",
};

function getDepartmentId(department) {
  if (!department) return "";

  return typeof department === "object"
    ? department._id || ""
    : department;
}

function getDepartmentName(department, departments = []) {
  if (!department) return "No department";

  if (typeof department === "object") {
    return department.name || "No department";
  }

  const found = departments.find(
    (item) => String(item._id) === String(department)
  );

  return found?.name || "No department";
}

function getPersonId(value) {
  if (!value) return "";

  return String(
    typeof value === "object" ? value._id || "" : value
  );
}
function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}
function getRoleLabel(role) {
  const labels = {
    admin: "Admin",
    hr: "HR",
    executive: "Executive",
    manager: "Manager",
    employee: "Employee",
  };
    const normalizedRole = normalizeRole(role);




  return labels[normalizedRole] || normalizedRole || "Employee";
}

function isSeniorTo(leadId, memberId, people) {
  const normalizedLeadId = getPersonId(leadId);
  const normalizedMemberId = getPersonId(memberId);

  if (
    !normalizedLeadId ||
    !normalizedMemberId ||
    normalizedLeadId === normalizedMemberId
  ) {
    return false;
  }

  const peopleById = new Map(
    people.map((person) => [getPersonId(person._id), person])
  );

  let current = peopleById.get(normalizedMemberId);
  const visited = new Set();

  while (current?.manager) {
    const managerId = getPersonId(current.manager);

    if (!managerId || visited.has(managerId)) {
      return false;
    }

    if (managerId === normalizedLeadId) {
      return true;
    }

    visited.add(managerId);
    current = peopleById.get(managerId);
  }

  return false;
}

function displayValue(value, fallback = "Unassigned") {
  if (value == null || value === "") return fallback;

  if (typeof value === "object") {
    return (
      value.name ||
      value.fullName ||
      value.title ||
      value.email ||
      fallback
    );
  }

  return String(value);
}

export default function Tasks() {
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [profileError, setProfileError] = useState("");

  const role = String(
    user?.role || user?.user?.role || user?.profile?.role || ""
  ).toLowerCase();
  
  const isAdmin = role === "admin";
  const isHR = role === "hr";
  const isHiringDepartmentMember = isHiringDepartment(user?.user || user);
  const isManager = role === "manager";
  const isExecutor = role === "executive";
  const isEmployee = role === "employee";

  // HR cannot create projects, assign teams, or add deliverables.
const canCreateProject =
  !isEmployee &&
  !isHR &&
  (isAdmin || isHiringDepartmentMember);

const canAssignTeam =
  !isEmployee &&
  !isHR &&
  (isAdmin || isHiringDepartmentMember);

const canAddDeliverable =
  !isEmployee &&
  !isHR &&
  (isAdmin || isHiringDepartmentMember || isManager || isExecutor);

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [people, setPeople] = useState([]);

  const [projectFilter, setProjectFilter] = useState("");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [managerFilter, setManagerFilter] = useState("ALL");
  const [leadFilter, setLeadFilter] = useState("ALL");
  const [memberFilter, setMemberFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [modal, setModal] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [feedback, setFeedback] = useState("");

  const [teamForm, setTeamForm] = useState({
    project: "Krew Platform",
    members: [],
    managers: [],
    leads: [],
  });

  // Load the logged-in user's profile and role.
  useEffect(() => {
    let active = true;

    async function fetchProfile() {
      try {
        const response = await fetch(
          "http://localhost:5000/api/users/me",
          { credentials: "include" }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load your profile."
          );
        }

        const profile = data.user || data.profile || data;

        console.log("Profile API response:", data);
        console.log("Loaded profile:", profile);
        console.log("Loaded role:", profile?.role);

        if (active) {
          setUser(profile);
          setProfileError("");
        }
      } catch (error) {
        if (active) {
          setProfileError(
            "Could not load your role. Check the profile endpoint in Tasks.jsx."
          );
        }
      }
    }

    fetchProfile();

    return () => {
      active = false;
    };
  }, []);

  // Load tasks.
  useEffect(() => {
    let active = true;

    async function fetchTasks() {
      try {
        const response = await fetch(
          "http://localhost:5000/api/tasks",
          { credentials: "include" }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load tasks.");
        }

        if (active) {
          setTasks(
            (data.tasks || []).map((task) => ({
              ...task,
              id: task._id,
            }))
          );
        }
      } catch (error) {
        if (active) {
          setFeedback(error.message);
        }
      }
    }

    fetchTasks();

    return () => {
      active = false;
    };
  }, []);

  // HR does not need the projects list.
  useEffect(() => {
    let active = true;

    async function fetchProjects() {
      if (!user || role === "hr") {
        return;
      }

      try {
        const response = await fetch(
          "http://localhost:5000/api/projects",
          { credentials: "include" }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to load projects."
          );
        }

        if (active) {
          const savedProjects = (data.projects || []).map((project) => ({
            ...project,
            id: project._id,
            departmentId: getDepartmentId(project.department),
            departmentName: getDepartmentName(project.department),
            members: project.members ?? 0,
            progress: project.progress ?? 0,
            status: project.status || "Assigned",
            color: project.color || "teal",
          }));

          setProjects(savedProjects);

          setTaskForm((current) => ({
            ...current,
            project: savedProjects.some(
              (project) => project.name === current.project
            )
              ? current.project
              : savedProjects[0]?.name || "",
          }));

          setTeamForm((current) => ({
            ...current,
            project: savedProjects.some(
              (project) => project.name === current.project
            )
              ? current.project
              : savedProjects[0]?.name || "",
          }));
        }
      } catch (error) {
        if (active) {
          setFeedback(error.message);
        }
      }
    }

    fetchProjects();

    return () => {
      active = false;
    };
  }, [user, role]);


const visibleProjects = useMemo(() => {
  if (!isAdmin) {
    return projects;
  }

  return projects.filter((project) => {
    const creatorId =
      project.createdBy?._id || project.createdBy;

    return String(creatorId || "") === String(user?._id || "");
  });
}, [projects, isAdmin, user?._id]);


const projectsWithMemberCounts = useMemo(() => {
  return visibleProjects.map((project) => {
    const projectTasks = tasks.filter((task) => {
      const taskProject =
        typeof task.project === "object" && task.project !== null
          ? task.project
          : null;

      const taskProjectId = taskProject
        ? taskProject._id || taskProject.id
        : task.projectId;

      const taskProjectName = taskProject
        ? taskProject.name
        : typeof task.project === "string"
          ? task.project
          : "";

      if (taskProjectId) {
        return String(taskProjectId) === String(project._id);
      }

      return (
        String(taskProjectName || "").trim().toLowerCase() ===
        String(project.name || "").trim().toLowerCase()
      );
    });

    const assignedMembers = new Set();

    // Include members already assigned to the project.
    
    if (Array.isArray(project.teamMembers)) {
      project.teamMembers.forEach((member) => {
        const memberId =
          typeof member === "object" && member !== null
            ? member._id || member.id
            : member;

        if (
          memberId &&
          String(memberId).trim().toLowerCase() !== "unassigned"
        ) {
          assignedMembers.add(String(memberId).trim().toLowerCase());
        }
      });
    }

    // Include members assigned to tasks in this project.
    projectTasks.forEach((task) => {
      const member = task.assignedTo || task.member || task.assignee;

      const memberId =
        typeof member === "object" && member !== null
          ? member._id || member.id
          : member;

      if (
        memberId &&
        String(memberId).trim().toLowerCase() !== "unassigned"
      ) {
        assignedMembers.add(String(memberId).trim().toLowerCase());
      }
    });

    return {
      ...project,
      members: assignedMembers.size,
      taskCount: projectTasks.length,
    };
  });
}, [visibleProjects, tasks]);

  // HR does not need department data.
  useEffect(() => {
    let active = true;

    async function fetchDepartments() {
      if (!user || role === "hr") {
        return;
      }

      try {
        const response = await fetch(
          "http://localhost:5000/api/departments",
          { credentials: "include" }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to fetch departments."
          );
        }

        const list = Array.isArray(data)
          ? data
          : data.departments || data.data || [];

        if (active) {
          setDepartments(list);
        }
      } catch (error) {
        if (active) {
          setFeedback(error.message);
        }
      }
    }

    fetchDepartments();

    return () => {
      active = false;
    };
  }, [user, role]);

  // HR does not need the people list.
  useEffect(() => {
    let active = true;

    async function fetchPeople() {
      if (!user || role === "hr") {
        return;
      }

      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          "http://localhost:5000/api/users",
          {
            credentials: "include",
            headers: token
              ? { Authorization: `Bearer ${token}` }
              : {},
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to load team members."
          );
        }

        const users = Array.isArray(data)
  ? data
  : data.users || data.employees || data.data || [];

        if (active) {
          setPeople(
            users.map((person) => ({
              ...person,
              _id: person._id,
              fullName:
                person.fullName || person.name || person.email,
            }))
          );
        }
      } catch (error) {
        if (active) {
          console.error("Fetch team members error:", error);
        }
      }
    }

    fetchPeople();

    return () => {
      active = false;
    };
  }, [user, role]);

  // Get the department of the selected project.
  const selectedTaskProject = projects.find(
    (project) => project.name === taskForm.project
  );

  const selectedProjectDepartmentId =
    getDepartmentId(selectedTaskProject?.department) ||
    selectedTaskProject?.departmentId ||
    "";

  // Only show people who belong to the selected project's department.
const projectDepartmentPeople = useMemo(() => {
  if (!selectedProjectDepartmentId) return [];

  return people.filter((person) => {
    const personDepartmentId = String(
      getDepartmentId(person.department) ||
      person.departmentId ||
      ""
    );

    return (
      personDepartmentId ===
      String(selectedProjectDepartmentId)
    );
  });
}, [people, selectedProjectDepartmentId]);


// const eligibleAssignedMembers = useMemo(() => {
//   if (!user?._id) return [];

//   if (isExecutor) {
//     return projectDepartmentPeople.filter(
//       (person) =>
//         String(person.role || "").toLowerCase() === "manager"
//     );
//   }
//     if (isManager) {
//     return projectDepartmentPeople.filter((person) =>
//       isSeniorTo(user._id, person._id, people)
//     );
//   }

//   if (isAdmin) {
//     return projectDepartmentPeople.filter((person) => {
//       const role = String(person.role || "").toLowerCase();

//       return (
//         String(person._id) !== String(user._id) &&
//         ["manager", "executive", "hr"].includes(role)
//       );
//     });
//   }

//   return projectDepartmentPeople.filter((person) =>
//     isSeniorTo(user._id, person._id, people)
//   );
// }, [
//   user?._id,
//   isExecutor,
//   isManager,
//   isAdmin,
//   projectDepartmentPeople,
//   people,
// ]);


const getPersonId = (value) => {
  if (!value) return "";
  return String(
    typeof value === "object" ? value._id || value.id || "" : value
  );
};

const eligibleAssignedMembers = people.filter((person) => {


  if (person.status && person.status !== "active") return false;
    const role = normalizeRole(person.role);


  // Manager: only direct-report employees
  if (isManager) {
    return (
      role === "employee" &&
      getPersonId(person.manager) === getPersonId(user?._id)
    );
  }

  // Executive: only managers in the same department
  if (isExecutor) {
    return (
      role === "manager" &&
      getPersonId(person.department) === getPersonId(user?.department)
    );
  }
    if (isAdmin) {
    return ["hr", "executive", "manager"].includes(role);
  }

  // Admin and other permitted roles can use the existing broader list
  return isHiringDepartmentMember;
});


console.log("Logged-in role:", role);
console.log("Selected project:", selectedTaskProject);
console.log(
  "Selected department ID:",
  selectedProjectDepartmentId
);
console.log("People loaded:", people);
console.log("People in project department:", projectDepartmentPeople);
console.log("Eligible assigned members:", eligibleAssignedMembers);

  const uniqueValues = (key) => [
    ...new Set(tasks.map((task) => task[key]).filter(Boolean)),
  ];

  const filteredTasks = useMemo(() => {
    const query = search.toLowerCase().trim();

    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        displayValue(task.title, "").toLowerCase().includes(query) ||
        displayValue(task.project, "").toLowerCase().includes(query) ||
        displayValue(task.team, "").toLowerCase().includes(query);

      return (
        matchesSearch &&
        (projectFilter === "ALL" || task.project === projectFilter) &&
        (departmentFilter === "ALL" || task.team === departmentFilter) &&
        (managerFilter === "ALL" || task.manager === managerFilter) &&
        (leadFilter === "ALL" || task.lead === leadFilter) &&
        (memberFilter === "ALL" || task.member === memberFilter) &&
        (statusFilter === "ALL" || task.status === statusFilter)
      );
    });
  }, [
    tasks,
    search,
    projectFilter,
    departmentFilter,
    managerFilter,
    leadFilter,
    memberFilter,
    statusFilter,
  ]);


const userId = String(user?._id || user?.user?._id || "");

const receivedTasks = useMemo(() => {
  if (!userId) return [];

  // Tasks assigned directly to the logged-in user.
  return tasks.filter((task) => {
    return (
      getPersonId(task.assignedTo) === userId ||
      getPersonId(task.member) === userId
    );
  });
}, [tasks, userId]);

const assignedByMeTasks = useMemo(() => {
  if (!userId) return [];

  // Tasks created by the logged-in user and assigned to others.
  return tasks.filter((task) => {
    const creatorId = getPersonId(task.createdBy);
    const assignedUserId =
      getPersonId(task.assignedTo) || getPersonId(task.member);

    return creatorId === userId && assignedUserId !== userId;
  });
}, [tasks, userId]);

// Count only the two task groups, without double-counting tasks.
// const myTasks = useMemo(() => {
//   const combined = new Map();

//   [...receivedTasks, ...assignedByMeTasks].forEach((task) => {
//     combined.set(String(task._id || task.id), task);
//   });

//   return [...combined.values()];
// }, [receivedTasks, assignedByMeTasks]);


const myTasks = useMemo(() => {
  if (!user?._id) return [];

  // Admin sees only tasks created by the Admin.
  if (isAdmin) {
    return tasks.filter(
      (task) =>
        getPersonId(task.createdBy) === String(user._id)
    );
  }

  if (isHR) return tasks;

  const userId = String(user._id);

  if (isEmployee) {
    return tasks.filter(
      (task) =>
        getPersonId(task.assignedTo) === userId ||
        getPersonId(task.member) === userId
    );
  }

  return tasks.filter(
    (task) =>
      getPersonId(task.assignedTo) === userId ||
      getPersonId(task.createdBy) === userId
  );
}, [tasks, user, isAdmin, isHR, isEmployee]);


const tasksAssignedToMe = useMemo(() => {
  if (!user?._id) return [];

  return tasks.filter(
    (task) => getPersonId(task.assignedTo) === String(user._id)
  );
}, [tasks, user?._id]);



const tasksAssignedByMe = useMemo(() => {
  if (!userId) return [];

  return tasks.filter((task) => {
    const creatorId = getPersonId(task.createdBy);
    const assigneeId =
      getPersonId(task.assignedTo) ||
      getPersonId(task.member);

    return creatorId === userId && assigneeId !== userId;
  });
}, [tasks, userId]);

// const totalTasks = isAdmin
//   // ? myTasks.length
//   ? tasks.length
//   : isHR || isEmployee
//     ? myTasks.length
//     : new Set([
//         ...tasksAssignedToMe,
//         ...tasksAssignedByMe,
//       ].map((task) => String(task._id || task.id))).size;


const totalTasks = useMemo(() => {
  const uniqueTasks = new Map();

  const addTasks = (taskList = []) => {
    taskList.forEach((task) => {
      const id = String(task._id || task.id || "");
      if (id) uniqueTasks.set(id, task);
    });
  };

  if (isAdmin) {
    // Admin: only tasks created/provided by this admin
    addTasks(tasks.filter(
      (task) => getPersonId(task.createdBy) === userId
    ));
  } else {
    // Tasks received and tasks provided by this user
    addTasks(tasksAssignedToMe);
    addTasks(tasksAssignedByMe);
  }

  return uniqueTasks.size;
}, [
  tasks,
  tasksAssignedToMe,
  tasksAssignedByMe,
  isAdmin,
  userId,
]);




const completedTasks = myTasks.filter(
  (task) => task.status === "Completed"
).length;

const inProgressTasks = myTasks.filter(
  (task) => task.status === "In Progress"
).length;

const overdueTasks = myTasks.filter(
  (task) =>
    task.status !== "Completed" &&
    task.due &&
    new Date(`${task.due}T23:59:59`) < new Date()
).length;
  function openModal(type) {
    setFeedback("");

    if (type === "project" && !canCreateProject) {
      setFeedback("You do not have permission to create projects.");
      return;
    }

    if (type === "team" && !canAssignTeam) {
      setFeedback("You do not have permission to assign project teams.");
      return;
    }

    if (type === "task" && !canAddDeliverable) {
      setFeedback("You do not have permission to create deliverables.");
      return;
    }

    if (type === "task") {
      const selectedProject = projects.some(
        (project) => project.name === projectFilter
      )
        ? projectFilter
        : projects.some(
              (project) => project.name === taskForm.project
            )
          ? taskForm.project
          : projects[0]?.name || "";

      setTaskForm({
        ...emptyTask,
        project: selectedProject,
        lead: user?._id || "",
        member: "",
      });

      if (!user?._id) {
        setFeedback(
          "Your profile is still loading. Please try again."
        );
        return;
      }
    }

    if (type === "team") {
      setTeamForm((current) => ({
        ...current,
        project: projects.some(
          (project) => project.name === current.project
        )
          ? current.project
          : projects[0]?.name || "",
      }));
    }

    setModal(type);
  }

  function closeModal() {
    setModal("");
    setSelectedTask(null);
  }

  async function handleCreateProject(event) {
    event.preventDefault();
    setFeedback("");

    const name = projectForm.name.trim();
    const code = projectForm.code.trim();

    if (!name || !code || !projectForm.department) {
      setFeedback("Project name and code are required.");
      return;
    }

    if (
      projects.some(
        (project) =>
          project.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      setFeedback("A project with this name already exists.");
      return;
    }

    const newProject = {
      name,
      code,
      department: projectForm.department,
      description: projectForm.description,
      start: projectForm.start,
      due: projectForm.due,
      progress: 0,
      status: "Assigned",
      members: 0,
      color: "teal",
    };

    try {
      const response = await fetch(
        "http://localhost:5000/api/projects",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newProject),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to create project."
        );
      }

      const savedProject = {
        ...data.project,
        id: data.project._id,
        departmentId:
          getDepartmentId(data.project.department) ||
          projectForm.department,
        departmentName: getDepartmentName(
          data.project.department,
          departments
        ),
        members: data.project.members ?? 0,
        progress: data.project.progress ?? 0,
        status: data.project.status || "Assigned",
        color: data.project.color || "teal",
      };

      setProjects((current) => [...current, savedProject]);
      setProjectForm(emptyProject);
      closeModal();
      setFeedback("Project saved successfully.");
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function handleCreateTask(event) {
    event.preventDefault();
    setFeedback("");

    if (!user?._id) {
      setFeedback("Unable to identify the logged-in user.");
      return;
    }

    const selectedProject = projects.find(
      (project) => project.name === taskForm.project
    );

    if (!selectedProject) {
      setFeedback("Please select an existing project.");
      return;
    }

    if (!taskForm.title.trim()) {
      setFeedback("Task title is required.");
      return;
    }

    if (!taskForm.member) {
      setFeedback("Please select an assigned member.");
      return;
    }

    if (String(user._id) === String(taskForm.member)) {
      setFeedback("You cannot assign a task to yourself.");
      return;
    }

    const allowedMember = eligibleAssignedMembers.some(
      (person) => String(person._id) === String(taskForm.member)
    );

    if (!allowedMember) {
      setFeedback(
        "You cannot assign a task to this member. Check the department and reporting hierarchy."
      );
      return;
    }

if (
  !isAdmin &&
  !isExecutor &&
  !isSeniorTo(user._id, taskForm.member, people)
) {
      setFeedback("You can only assign tasks to your subordinates.");
      return;
    }

    const newTask = {
      project: taskForm.project,
      title: taskForm.title.trim(),
      team: getDepartmentName(
        selectedProject.department,
        departments
      ),
      department:
        getDepartmentId(selectedProject.department) ||
        selectedProject.departmentId ||
        "",
      lead: user._id,
      manager: user._id,
      member: taskForm.member,
      priority: taskForm.priority,
      due: taskForm.due,
      progress: 0,
      status: "Assigned",
      description: taskForm.description,
      category: taskForm.category,
    };

    try {
      const response = await fetch(
        "http://localhost:5000/api/tasks",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newTask),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to create task."
        );
      }

      setTasks((current) => [
        { ...data.task, id: data.task._id },
        ...current,
      ]);

      setTaskForm({
        ...emptyTask,
        lead: user._id,
      });

      closeModal();
      setFeedback("Task created successfully.");
    } catch (error) {
      setFeedback(error.message);
    }
  }

  function handleAssignTeam(event) {
    event.preventDefault();

    const { project, members, managers, leads } = teamForm;

    if (!members.length) {
      setFeedback("Select at least one project member.");
      return;
    }

    setProjects((current) =>
      current.map((item) =>
        item.name === project
          ? {
              ...item,
              members: Math.max(item.members, members.length),
            }
          : item
      )
    );

    setTasks((current) =>
      current.map((task) =>
        task.project === project
          ? {
              ...task,
              manager: managers[0] || task.manager,
              lead: leads[0] || task.lead,
            }
          : task
      )
    );

    setFeedback("Team assignment updated in this demo.");
    closeModal();
  }

  async function updateTaskStatus(task, status) {
    setFeedback("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/tasks/${task.id}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update task status."
        );
      }

      const updatedTask = {
        ...data.task,
        id: data.task._id,
      };

      setTasks((current) =>
        current.map((item) =>
          item.id === task.id ? updatedTask : item
        )
      );

      setSelectedTask(null);
      setFeedback("Task status updated successfully.");
    } catch (error) {
      setFeedback(error.message);
    }
  }

  function resetFilters() {
    setSearch("");
    setProjectFilter("ALL");
    setDepartmentFilter("ALL");
    setManagerFilter("ALL");
    setLeadFilter("ALL");
    setMemberFilter("ALL");
    setStatusFilter("ALL");
  }

  function formatDate(date) {
    if (!date) return "Not set";

    return new Date(`${date}T00:00:00`).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  // HR-only dashboard.
  // This early return prevents HR from seeing the project dashboard,
  // project filters, creation forms, and task detail modal.
  if (isHR) {
    return (
      <div className="dashboard-shell tasks-shell">
        <Sidebar user={user} role="hr" />

        <main className="workday-main tasks-main">
          <header className="tasks-page-header">
            <div>
              <div className="tasks-eyebrow">KREW / MY WORK</div>
              <h1>
                My Tasks<span className="title-dot">.</span>
              </h1>
              <p>
                Track your assigned tasks and update their status.
              </p>
            </div>
          </header>

          {profileError && (
            <div className="tasks-feedback" role="alert">
              {profileError}
            </div>
          )}

          {feedback && (
            <div className="tasks-feedback" role="status">
              {feedback}
              <button
                onClick={() => setFeedback("")}
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}

          <section className="tasks-metrics">
            <article className="tasks-metric">
              <div className="metric-top">
                <span className="metric-icon metric-icon-teal">
                  ▦
                </span>
                <span className="metric-caption">
                  MY TOTAL TASKS
                </span>
              </div>
              <strong>{String(totalTasks).padStart(2, "0")}</strong>
              <span className="metric-footer">
                Tasks assigned to you
              </span>
            </article>

            <article className="tasks-metric">
              <div className="metric-top">
                <span className="metric-icon metric-icon-lime">
                  ✓
                </span>
                <span className="metric-caption">COMPLETED</span>
              </div>
              <strong>
                {String(completedTasks).padStart(2, "0")}
              </strong>
              <span className="metric-footer">
                {totalTasks
                  ? Math.round(
                      (completedTasks / totalTasks) * 100
                    )
                  : 0}
                % completed
              </span>
            </article>

            <article className="tasks-metric">
              <div className="metric-top">
                <span className="metric-icon metric-icon-orange">
                  ◷
                </span>
                <span className="metric-caption">
                  OVERDUE TASKS
                </span>
              </div>
              <strong>{String(overdueTasks).padStart(2, "0")}</strong>
              <span className="metric-footer">
                Need your attention
              </span>
            </article>
          </section>
 
          {/* <section className="tasks-section work-queue">
            <div className="tasks-section-heading">
              <div>
                <span className="tasks-section-kicker">
                  YOUR WORK
                </span>
                <h2>Assigned tasks</h2>
                <p>
                  Update the status of your tasks below.
                </p>
              </div>

              <span className="tasks-count-badge">
                {myTasks.length} tasks
              </span>
            </div>

            <div className="tasks-table-wrap">
              <table className="tasks-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Due date</th>
                    <th>Status</th>
                    <th>Update status</th>
                  </tr>
                </thead>

                <tbody>
                  {myTasks.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <div className="table-task-title">
                          {displayValue(
                            task.title,
                            "Untitled task"
                          )}
                        </div>
                      </td>

                      <td className="task-due-date">
                        {formatDate(task.due)}
                      </td>

                      <td>
                        <span
                          className={`task-status status-${String(
                            task.status || "Assigned"
                          )
                            .toLowerCase()
                            .replaceAll(" ", "-")}`}
                        >
                          <i />
                          {task.status || "Assigned"}
                        </span>
                      </td>

                      <td>
                        <div className="hr-task-actions">
                          {task.status !== "In Progress" &&
                            task.status !== "Completed" && (
                              <button
                                className="tasks-button tasks-button-secondary"
                                onClick={() =>
                                  updateTaskStatus(
                                    task,
                                    "In Progress"
                                  )
                                }
                              >
                                Start task
                              </button>
                            )}

                          {task.status !== "Completed" && (
                            <button
                              className="tasks-button tasks-button-primary"
                              onClick={() =>
                                updateTaskStatus(
                                  task,
                                  "Completed"
                                )
                              }
                            >
                              Mark completed
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {myTasks.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        <div className="tasks-empty-state">
                          <strong>
                            No tasks assigned yet
                          </strong>
                          <p>
                            Your assigned tasks will appear here.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section> 
 */}
{(isManager || isExecutor) ? (
  <div className="task-groups">
    {/* Tasks assigned to the logged-in user */}
    <section className="tasks-section work-queue">
      <div className="tasks-section-heading">
        <div>
          <span className="tasks-section-kicker">YOUR WORK</span>
          <h2>Tasks Assigned to Me</h2>
          <p>Tasks assigned to your account.</p>
        </div>

        <span className="tasks-count-badge">
          {tasksAssignedToMe.length} tasks
        </span>
      </div>

      <div className="tasks-table-wrap">
        <table className="tasks-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Due date</th>
              <th>Status</th>
              <th>Update status</th>
            </tr>
          </thead>

          <tbody>
            {tasksAssignedToMe.map((task) => (
              <tr key={task.id || task._id}>
                <td>
                  <div className="table-task-title">
                    {displayValue(task.title, "Untitled task")}
                  </div>
                </td>

                <td className="task-due-date">
                  {formatDate(task.due)}
                </td>

                <td>
                  <span
                    className={`task-status status-${String(
                      task.status || "Assigned"
                    )
                      .toLowerCase()
                      .replaceAll(" ", "-")}`}
                  >
                    <i />
                    {task.status || "Assigned"}
                  </span>
                </td>

                <td>
                  <div className="hr-task-actions">
                    {task.status !== "In Progress" &&
                      task.status !== "Completed" && (
                        <button
                          className="tasks-button tasks-button-secondary"
                          onClick={() =>
                            updateTaskStatus(task, "In Progress")
                          }
                        >
                          Start task
                        </button>
                      )}

                    {task.status !== "Completed" && (
                      <button
                        className="tasks-button tasks-button-primary"
                        onClick={() =>
                          updateTaskStatus(task, "Completed")
                        }
                      >
                        Mark completed
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {tasksAssignedToMe.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <div className="tasks-empty-state">
                    <strong>No tasks assigned to you</strong>
                    <p>Tasks assigned to your account will appear here.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>

    {/* Tasks the logged-in user assigned to others */}
    <section className="tasks-section work-queue">
      <div className="tasks-section-heading">
        <div>
          <span className="tasks-section-kicker">TEAM WORK</span>
          <h2>Tasks Assigned by Me</h2>
          <p>Tasks you created for your team.</p>
        </div>

        <span className="tasks-count-badge">
          {tasksAssignedByMe.length} tasks
        </span>
      </div>

      <div className="tasks-table-wrap">
        <table className="tasks-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Due date</th>
              <th>Status</th>
              <th>Update status</th>
            </tr>
          </thead>

          <tbody>
            {tasksAssignedByMe.map((task) => (
              <tr key={task.id || task._id}>
                <td>
                  <div className="table-task-title">
                    {displayValue(task.title, "Untitled task")}
                  </div>
                </td>

                <td className="task-due-date">
                  {formatDate(task.due)}
                </td>

                <td>
                  <span
                    className={`task-status status-${String(
                      task.status || "Assigned"
                    )
                      .toLowerCase()
                      .replaceAll(" ", "-")}`}
                  >
                    <i />
                    {task.status || "Assigned"}
                  </span>
                </td>

                <td>
                  <div className="hr-task-actions">
                    {task.status !== "In Progress" &&
                      task.status !== "Completed" && (
                        <button
                          className="tasks-button tasks-button-secondary"
                          onClick={() =>
                            updateTaskStatus(task, "In Progress")
                          }
                        >
                          Start task
                        </button>
                      )}

                    {task.status !== "Completed" && (
                      <button
                        className="tasks-button tasks-button-primary"
                        onClick={() =>
                          updateTaskStatus(task, "Completed")
                        }
                      >
                        Mark completed
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {tasksAssignedByMe.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <div className="tasks-empty-state">
                    <strong>No tasks assigned by you</strong>
                    <p>Tasks you assign to your team will appear here.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  </div>
) : (
  /* Admin and other roles retain the single task list */
  <section className="tasks-section work-queue">
    <div className="tasks-section-heading">
      <div>
        <span className="tasks-section-kicker">YOUR WORK</span>
        <h2>Assigned tasks</h2>
        <p>Update the status of your tasks below.</p>
      </div>

      <span className="tasks-count-badge">
        {myTasks.length} tasks
      </span>
    </div>

    <div className="tasks-table-wrap">
      <table className="tasks-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Due date</th>
            <th>Status</th>
            <th>Update status</th>
          </tr>
        </thead>

        <tbody>
          {myTasks.map((task) => (
            <tr key={task.id || task._id}>
              <td>
                <div className="table-task-title">
                  {displayValue(task.title, "Untitled task")}
                </div>
              </td>

              <td className="task-due-date">
                {formatDate(task.due)}
              </td>

              <td>
                <span
                  className={`task-status status-${String(
                    task.status || "Assigned"
                  )
                    .toLowerCase()
                    .replaceAll(" ", "-")}`}
                >
                  <i />
                  {task.status || "Assigned"}
                </span>
              </td>

              <td>
                <div className="hr-task-actions">
                  {task.status !== "In Progress" &&
                    task.status !== "Completed" && (
                      <button
                        className="tasks-button tasks-button-secondary"
                        onClick={() =>
                          updateTaskStatus(task, "In Progress")
                        }
                      >
                        Start task
                      </button>
                    )}

                  {task.status !== "Completed" && (
                    <button
                      className="tasks-button tasks-button-primary"
                      onClick={() =>
                        updateTaskStatus(task, "Completed")
                      }
                    >
                      Mark completed
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}

          {myTasks.length === 0 && (
            <tr>
              <td colSpan={4}>
                <div className="tasks-empty-state">
                  <strong>No tasks available</strong>
                  <p>Your tasks will appear here.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
)}


          
        </main>
      </div>
    );
  }


  if (isEmployee) {
  return (
    <div className="dashboard-shell tasks-shell">
      <Sidebar user={user} role="employee" />

      <main className="workday-main tasks-main">
        <header className="tasks-page-header">
          <div>
            <div className="tasks-eyebrow">KREW / MY WORK</div>
            <h1>
              My Tasks<span className="title-dot">.</span>
            </h1>
            <p>
              View your assigned work, track deadlines, and update task status.
            </p>
          </div>
        </header>

        {profileError && (
          <div className="tasks-feedback" role="alert">
            {profileError}
          </div>
        )}

        {feedback && (
          <div className="tasks-feedback" role="status">
            {feedback}
            <button
              onClick={() => setFeedback("")}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        <section className="tasks-metrics">
          <article className="tasks-metric">
            <div className="metric-top">
              <span className="metric-icon metric-icon-teal">▦</span>
              <span className="metric-caption">MY TASKS</span>
            </div>
            <strong>{String(totalTasks).padStart(2, "0")}</strong>
            <span className="metric-footer">Assigned to you</span>
          </article>

          <article className="tasks-metric">
            <div className="metric-top">
              <span className="metric-icon metric-icon-lime">✓</span>
              <span className="metric-caption">COMPLETED</span>
            </div>
            <strong>{String(completedTasks).padStart(2, "0")}</strong>
            <span className="metric-footer">
              {totalTasks
                ? Math.round((completedTasks / totalTasks) * 100)
                : 0}
              % completed
            </span>
          </article>

          <article className="tasks-metric">
            <div className="metric-top">
              <span className="metric-icon metric-icon-orange">◷</span>
              <span className="metric-caption">OVERDUE</span>
            </div>
            <strong>{String(overdueTasks).padStart(2, "0")}</strong>
            <span className="metric-footer">Need your attention</span>
          </article>
        </section>

        <section className="tasks-section work-queue">
          <div className="tasks-section-heading">
            <div>
              <span className="tasks-section-kicker">YOUR WORK</span>
              <h2>Assigned tasks</h2>
              <p>Start tasks, review deadlines, and update progress.</p>
            </div>

            <span className="tasks-count-badge">
              {myTasks.length} tasks
            </span>
          </div>

          <div className="tasks-table-wrap">
            <table className="tasks-table">
              <thead>
                <tr>
                  <th>Task / Project</th>
                  <th>Priority</th>
                  <th>Due date</th>
                  <th>Status</th>
                  <th>Update status</th>
                </tr>
              </thead>

              <tbody>
                {myTasks.map((task) => (
                  <tr key={task.id || task._id}>
                    <td>
                      <div className="table-task-title">
                        {displayValue(task.title, "Untitled task")}
                      </div>
                      <div className="table-task-project">
                        {displayValue(task.project, "No project")}
                      </div>
                    </td>

                    <td>{task.priority || "Medium"}</td>

                    <td className="task-due-date">
                      {formatDate(task.due)}
                    </td>

                    <td>
                      <span
                        className={`task-status status-${String(
                          task.status || "Assigned"
                        )
                          .toLowerCase()
                          .replaceAll(" ", "-")}`}
                      >
                        <i />
                        {task.status || "Assigned"}
                      </span>
                    </td>

                    <td>
                      <div className="hr-task-actions">
                        {task.status !== "In Progress" &&
                          task.status !== "Completed" && (
                            <button
                              className="tasks-button tasks-button-secondary"
                              onClick={() =>
                                updateTaskStatus(task, "In Progress")
                              }
                            >
                              Start task
                            </button>
                          )}

                        {task.status !== "Completed" && (
                          <button
                            className="tasks-button tasks-button-primary"
                            onClick={() =>
                              updateTaskStatus(
                                task,
                                "Pending Review"
                              )
                            }
                          >
                            Submit for review
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {myTasks.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <div className="tasks-empty-state">
                        <strong>No tasks assigned yet</strong>
                        <p>
                          Tasks assigned to you by your manager will appear here.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="tasks-footer">
          <span className="footer-status-dot" />
          KREW WORKSPACE
          <span>Your work, clearly organized.</span>
        </footer>
      </main>
    </div>
  );
}



  // Existing full dashboard for non-HR users.
  return (
    <div className="dashboard-shell tasks-shell">
      <Sidebar
        user={user}
        role={
          user?.role ||
          location.pathname.split("/")[1] ||
          "employee"
        }
      />

      <main className="workday-main tasks-main">
        {profileError && (
          <div className="tasks-feedback" role="alert">
            {profileError}
          </div>
        )}

        <header className="tasks-page-header">
          <div>
            <div className="tasks-eyebrow">
              KREW / WORK MANAGEMENT
            </div>
            <h1>
              Projects <span>&</span> Tasks
              <span className="title-dot">.</span>
            </h1>
            <p>
              Coordinate projects, organize your teams, and keep every
              deliverable moving forward.
            </p>
          </div>

          <div className="tasks-header-actions">
            {canAssignTeam && (
              <button
                className="tasks-button tasks-button-secondary"
                onClick={() => openModal("team")}
              >
                <span>♧</span> Assign team
              </button>
            )}

            {canCreateProject && (
              <button
                className="tasks-button tasks-button-primary"
                onClick={() => openModal("project")}
              >
                <span>＋</span> Create project
              </button>
            )}
          </div>
        </header>

        {feedback && (
          <div className="tasks-feedback" role="status">
            {feedback}
            <button
              onClick={() => setFeedback("")}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        <section className="tasks-hero">
          <div className="tasks-hero-copy">
            <span className="tasks-hero-kicker">
              YOUR WORKSPACE OVERVIEW
            </span>
            <h2>Make progress visible.</h2>
            <p>
              One place to track delivery, understand priorities, and
              keep everyone aligned.
            </p>

            {canAddDeliverable && (
              <button
                className="tasks-button tasks-button-light"
                onClick={() => openModal("task")}
              >
                + Add a deliverable <span>→</span>
              </button>
            )}
          </div>

          <div className="tasks-hero-art" aria-hidden="true">
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="hero-art-center">K</div>
            <span className="hero-art-dot dot-one" />
            <span className="hero-art-dot dot-two" />
            <span className="hero-art-dot dot-three" />
          </div>
        </section>

        <section className="tasks-metrics">
          <article className="tasks-metric">
            <div className="metric-top">
              <span className="metric-icon metric-icon-teal">
                ▦
              </span>
              <span className="metric-caption">ALL PROJECTS</span>
            </div>
            <strong>
              {/* {projects.length.toString().padStart(2, "0")} */}


                {projects.filter(
    (project) =>
      String(project.createdBy?._id || project.createdBy) ===
      String(user?._id || user?.id)
  ).length.toString().padStart(2, "0")}
            </strong>
            <span className="metric-footer">
              Across your workspace
            </span>
          </article>

          <article className="tasks-metric">
            <div className="metric-top">
              <span className="metric-icon metric-icon-purple">
                ◇
              </span>
              <span className="metric-caption">TOTAL TASKS</span>
            </div>
            <strong>
              {totalTasks.toString().padStart(2, "0")}
            </strong>
            <span className="metric-footer">
              Assigned deliverables
            </span>
          </article>

          <article className="tasks-metric">
            <div className="metric-top">
              <span className="metric-icon metric-icon-lime">
                ✓
              </span>
              <span className="metric-caption">COMPLETED</span>
            </div>
            <strong>
              {completedTasks.toString().padStart(2, "0")}
            </strong>
            <span className="metric-footer">
              {totalTasks
                ? Math.round(
                    (completedTasks / totalTasks) * 100
                  )
                : 0}
              % of all tasks
            </span>
          </article>

          <article className="tasks-metric">
            <div className="metric-top">
              <span className="metric-icon metric-icon-orange">
                ◷
              </span>
              <span className="metric-caption">
                OVERDUE TASKS
              </span>
            </div>
            <strong>
              {overdueTasks.toString().padStart(2, "0")}
            </strong>
            <span className="metric-footer">
              Need your attention
            </span>
          </article>
        </section>

        <section className="tasks-section">
          <div className="tasks-section-heading">
            <div>
              <span className="tasks-section-kicker">
                YOUR PORTFOLIO
              </span>
              <h2>Active projects</h2>
              <p>
                See how work is progressing across your teams.
              </p>
            </div>


            <span className="tasks-count-badge">
              {projects.length} projects
            </span>
          </div>

          <div className="project-grid">
            {projectsWithMemberCounts.map((project) => (
              <article className="project-card" key={project.id}>
                <div className="project-card-top">
                  <span
                    className={`project-symbol ${project.color}`}
                  >
                    {project.name.charAt(0)}
                  </span>

                  <span
                    className={`task-status ${
                      project.status === "Completed"
                        ? "status-completed"
                        : "status-progress"
                    }`}
                  >
                    <i />
                    {project.status}
                  </span>
                </div>

                <span className="project-code">
                  {project.code}
                </span>
                <h3>{project.name}</h3>
                <p className="project-department">
                  {project.departmentName ||
                    getDepartmentName(
                      project.department,
                      departments
                    )}
                </p>

                <div className="project-progress-heading">
                  <span>Completion</span>
                  <strong>{project.progress}%</strong>
                </div>

                <div className="tasks-progress-track">
                  <span
                    style={{ width: `${project.progress}%` }}
                    className={project.color}
                  />
                </div>

                <div className="project-card-footer">
                  <span>
                    {/* ♙{" "}
                    {project.members ??
                      project.teamMembers?.length ??
                      0}{" "}
                    members */}

                    
                    ♙{" "}
                    {project.taskCount ?? 0}{" "}
                    tasks

                  </span>

                  <button
                    onClick={() => {
                      setProjectFilter(project.name);
                      document
                        .getElementById("work-queue")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    View tasks <span>↗</span>
                  </button>
                </div>
              </article>
            ))}

            {canCreateProject && (
              <button
                className="project-create-card"
                onClick={() => openModal("project")}
              >
                <span className="project-create-icon">＋</span>
                <strong>Create a project</strong>
                <span>
                  Start organizing your next initiative.
                </span>
              </button>
            )}
          </div>
        </section>

        <section
          className="tasks-section work-queue"
          id="work-queue"
        >
          <div className="tasks-section-heading queue-heading">
            <div>
              <span className="tasks-section-kicker">
                DELIVERY TRACKER
              </span>
              <h2>Work queue</h2>
              <p>
                Search, filter, and manage deliverables in one place.
              </p>
            </div>

            {canAddDeliverable && (
              <button
                className="tasks-button tasks-button-primary"
                onClick={() => openModal("task")}
              >
                ＋ Add deliverable
              </button>
            )}
          </div>

          <div className="queue-toolbar">
            <div className="task-search-wrap">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tasks or projects..."
                aria-label="Search tasks or projects"
              />
            </div>

            <button
              className="tasks-button tasks-button-ghost"
              onClick={resetFilters}
            >
              ↺ Reset filters
            </button>
          </div>

          <div className="task-filters">
            <FilterSelect
              label="Project"
              value={projectFilter}
              onChange={setProjectFilter}
              options={projects.map((project) => project.name)}
            />

            <FilterSelect
              label="Department"
              value={departmentFilter}
              onChange={setDepartmentFilter}
              options={departments
                .map((department) => department.name)
                .filter(Boolean)}
            />

            <FilterSelect
              label="Manager"
              value={managerFilter}
              onChange={setManagerFilter}
              options={uniqueValues("manager")}
            />

            <FilterSelect
              label="Team lead"
              value={leadFilter}
              onChange={setLeadFilter}
              options={uniqueValues("lead")}
            />

            <FilterSelect
              label="Member"
              value={memberFilter}
              onChange={setMemberFilter}
              options={uniqueValues("member")}
            />

            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                "Assigned",
                "In Progress",
                "Pending Review",
                "Completed",
              ]}
            />
          </div>

          <div className="queue-results">
            <span>
              Showing <strong>{filteredTasks.length}</strong> of{" "}
              {tasks.length} tasks
            </span>
            <span>
              {inProgressTasks} tasks currently in progress
            </span>
          </div>

          <div className="tasks-table-wrap">
            <table className="tasks-table">
              <thead>
                <tr>
                  <th>Task / Project</th>
                  <th>Responsible team</th>
                  <th>Priority</th>
                  <th>Due date</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <div className="table-task-title">
                        {displayValue(
                          task.title,
                          "Untitled task"
                        )}
                      </div>
                      <div className="table-task-project">
                        {displayValue(task.project, "No project")}
                      </div>
                    </td>

                    <td>
                      <div className="table-team">
                        {displayValue(
                          task.team,
                          "No department"
                        )}
                      </div>

                      <div className="table-team-member">
                        {displayValue(
                          typeof task.member === "object"
                            ? task.member
                            : people.find(
                                (person) =>
                                  String(person._id) ===
                                  String(task.member)
                              ),
                          "Unassigned"
                        )}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`priority-badge priority-${String(
                          task.priority || "medium"
                        )
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        <i />
                        {task.priority || "Medium"}
                      </span>
                    </td>

                    <td className="task-due-date">
                      {formatDate(task.due)}
                    </td>

                    <td>
                      <div className="table-progress">
                        <div className="tasks-progress-track">
                          <span
                            style={{
                              width: `${task.progress || 0}%`,
                            }}
                          />
                        </div>
                        <strong>{task.progress || 0}%</strong>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`task-status status-${String(
                          task.status || "Assigned"
                        )
                          .toLowerCase()
                          .replaceAll(" ", "-")}`}
                      >
                        <i />
                        {task.status || "Assigned"}
                      </span>
                    </td>

                    <td>
                      <button
                        className="task-action-button"
                        onClick={() => setSelectedTask(task)}
                        aria-label={`View ${task.title}`}
                      >
                        ↗
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="tasks-empty-state">
                        <span>⌕</span>
                        <strong>No matching tasks</strong>
                        <p>
                          Try changing your search or filters.
                        </p>
                        <button
                          className="tasks-button tasks-button-ghost"
                          onClick={resetFilters}
                        >
                          Clear all filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="tasks-footer">
          <span className="footer-status-dot" />
          KREW WORKSPACE
          <span>Project management made clearer.</span>
        </footer>
      </main>

      {modal && (
        <div
          className="tasks-modal-backdrop"
          onMouseDown={closeModal}
        >
          <section
            className="tasks-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tasks-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="tasks-modal-header">
              <div>
                <span className="tasks-section-kicker">
                  KREW / WORKSPACE TOOLS
                </span>
                <h2 id="tasks-modal-title">
                  {modal === "project"
                    ? "Create a project"
                    : modal === "team"
                      ? "Assign project team"
                      : "Add a deliverable"}
                </h2>
                <p>
                  {modal === "project"
                    ? "Set up a new initiative for your team."
                    : modal === "team"
                      ? "Choose the people responsible for a project."
                      : "Create a task and assign its owner."}
                </p>
              </div>

              <button
                className="tasks-modal-close"
                onClick={closeModal}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            {modal === "project" && (
              <form
                className="tasks-form"
                onSubmit={handleCreateProject}
              >
                <div className="tasks-form-grid">
                  <FormField label="Project name">
                    <input
                      required
                      value={projectForm.name}
                      onChange={(event) =>
                        setProjectForm({
                          ...projectForm,
                          name: event.target.value,
                        })
                      }
                      placeholder="e.g. Customer Portal"
                    />
                  </FormField>

                  <FormField label="Project code">
                    <input
                      required
                      value={projectForm.code}
                      onChange={(event) =>
                        setProjectForm({
                          ...projectForm,
                          code: event.target.value,
                        })
                      }
                      placeholder="e.g. PROJ-04"
                    />
                  </FormField>

                  <FormField label="Department">
                    <select
                      required
                      value={projectForm.department}
                      onChange={(event) =>
                        setProjectForm((current) => ({
                          ...current,
                          department: event.target.value,
                        }))
                      }
                    >
                      <option value="">
                        Select a department
                      </option>

                      {departments.map((department) => (
                        <option
                          key={department._id}
                          value={department._id}
                        >
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Start date">
                    <input
                      type="date"
                      value={projectForm.start}
                      onChange={(event) =>
                        setProjectForm({
                          ...projectForm,
                          start: event.target.value,
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Target date">
                    <input
                      type="date"
                      value={projectForm.due}
                      onChange={(event) =>
                        setProjectForm({
                          ...projectForm,
                          due: event.target.value,
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Description" full>
                    <textarea
                      rows="3"
                      value={projectForm.description}
                      onChange={(event) =>
                        setProjectForm({
                          ...projectForm,
                          description: event.target.value,
                        })
                      }
                      placeholder="What will this project achieve?"
                    />
                  </FormField>
                </div>

                <ModalActions
                  onCancel={closeModal}
                  submitText="Create project"
                />
              </form>
            )}

            {modal === "task" && (
              <form
                className="tasks-form"
                onSubmit={handleCreateTask}
              >
                <div className="tasks-form-grid">
                  <FormField label="Task title" full>
                    <input
                      required
                      value={taskForm.title}
                      onChange={(event) =>
                        setTaskForm({
                          ...taskForm,
                          title: event.target.value,
                        })
                      }
                      placeholder="e.g. Complete API integration"
                    />
                  </FormField>

                  <FormField label="Project">
                    <select
                      required
                      value={taskForm.project}
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          project: event.target.value,
                          lead: "",
                          member: "",
                        }))
                      }
                    >
                      <option value="" disabled>
                        Select a project
                      </option>

                      {projects.map((project) => (
                        <option
                          key={project.id}
                          value={project.name}
                        >
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Priority">
                    <select
                      value={taskForm.priority}
                      onChange={(event) =>
                        setTaskForm({
                          ...taskForm,
                          priority: event.target.value,
                        })
                      }
                    >
                      <option>Critical</option>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </FormField>

                  <FormField label="Assigned member">
                    <select
                      required
                      value={taskForm.member}
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          member: event.target.value,
                        }))
                      }
                    >
                      <option value="">
                        Select an assigned member
                      </option>

                      {eligibleAssignedMembers.map((person) => (
                        <option
                          key={person._id}
                          value={person._id}
                        >
                          {person.fullName} —{" "}
                          {getRoleLabel(person.role)}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Team lead">
                    <input
                      type="text"
                      value={
                        user?.fullName ||
                        user?.name ||
                        user?.email ||
                        "Loading user..."
                      }
                      readOnly
                    />
                  </FormField>

                  <FormField label="Category">
                    <input
                      value={taskForm.category}
                      onChange={(event) =>
                        setTaskForm({
                          ...taskForm,
                          category: event.target.value,
                        })
                      }
                      placeholder="e.g. Frontend"
                    />
                  </FormField>

                  <FormField label="Deadline">
                    <input
                      type="date"
                      value={taskForm.due}
                      onChange={(event) =>
                        setTaskForm({
                          ...taskForm,
                          due: event.target.value,
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Description" full>
                    <textarea
                      rows="3"
                      value={taskForm.description}
                      onChange={(event) =>
                        setTaskForm({
                          ...taskForm,
                          description: event.target.value,
                        })
                      }
                      placeholder="Describe the expected outcome..."
                    />
                  </FormField>
                </div>

                <ModalActions
                  onCancel={closeModal}
                  submitText="Create deliverable"
                />
              </form>
            )}

            {modal === "team" && (
              <form
                className="tasks-form"
                onSubmit={handleAssignTeam}
              >
                <FormField label="Project">
                  <select
                    value={teamForm.project}
                    onChange={(event) =>
                      setTeamForm({
                        ...teamForm,
                        project: event.target.value,
                      })
                    }
                  >
                    {projects.map((project) => (
                      <option
                        key={project.id}
                        value={project.name}
                      >
                        {project.name}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Project members">
                  <div className="tasks-selection-list">
                    {people.map((person) => (
                      <label key={person._id}>
                        <input
                          type="checkbox"
                          checked={teamForm.members.includes(
                            person._id
                          )}
                          onChange={(event) =>
                            setTeamForm((current) => ({
                              ...current,
                              members: event.target.checked
                                ? [
                                    ...current.members,
                                    person._id,
                                  ]
                                : current.members.filter(
                                    (id) => id !== person._id
                                  ),
                            }))
                          }
                        />

                        <span className="selection-avatar">
                          {(
                            person.fullName ||
                            person.email ||
                            "?"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </span>

                        <span>
                          {person.fullName || person.email}
                        </span>
                      </label>
                    ))}
                  </div>
                </FormField>

                <FormField label="Responsible manager">
                  <select
                    value={teamForm.managers[0] || ""}
                    onChange={(event) =>
                      setTeamForm((current) => ({
                        ...current,
                        managers: event.target.value
                          ? [event.target.value]
                          : [],
                      }))
                    }
                  >
                    <option value="">
                      No manager selected
                    </option>

                    {people
                      .filter(
                        (person) => person.role === "manager"
                      )
                      .map((person) => (
                        <option
                          key={person._id}
                          value={person._id}
                        >
                          {person.fullName}
                        </option>
                      ))}
                  </select>
                </FormField>

                <FormField label="Team lead">
                  <select
                    value={teamForm.leads[0] || ""}
                    onChange={(event) =>
                      setTeamForm((current) => ({
                        ...current,
                        leads: event.target.value
                          ? [event.target.value]
                          : [],
                      }))
                    }
                  >
                    <option value="">No lead selected</option>

                    {people
                      .filter(
                        (person) => person.role === "executive"
                      )
                      .map((person) => (
                        <option
                          key={person._id}
                          value={person._id}
                        >
                          {person.fullName}
                        </option>
                      ))}
                  </select>
                </FormField>

                <ModalActions
                  onCancel={closeModal}
                  submitText="Save team assignment"
                />
              </form>
            )}
          </section>
        </div>
      )}

      {selectedTask && (
        <div
          className="tasks-modal-backdrop"
          onMouseDown={() => setSelectedTask(null)}
        >
          <section
            className="tasks-modal task-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-detail-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="tasks-modal-header">
              <div>
                <span className="tasks-section-kicker">
                  TASK DETAILS
                </span>
                <h2 id="task-detail-title">
                  {selectedTask.title}
                </h2>
                <p>{displayValue(selectedTask.project)}</p>
              </div>

              <button
                className="tasks-modal-close"
                onClick={() => setSelectedTask(null)}
                aria-label="Close task details"
              >
                ×
              </button>
            </div>

            <div className="task-detail-grid">
              <div>
                <span>Responsible team</span>
                <strong>
                  {displayValue(
                    selectedTask.team,
                    "No department"
                  )}
                </strong>
              </div>

              <div>
                <span>Assigned member</span>
                <strong>
                  {displayValue(
                    typeof selectedTask.member === "object"
                      ? selectedTask.member
                      : people.find(
                          (person) =>
                            String(person._id) ===
                            String(selectedTask.member)
                        ),
                    "Unassigned"
                  )}
                </strong>
              </div>

              <div>
                <span>Reporting member (Team Lead)</span>
                <strong>
                  {displayValue(
                    typeof selectedTask.lead === "object"
                      ? selectedTask.lead
                      : people.find(
                          (person) =>
                            String(person._id) ===
                            String(selectedTask.lead)
                        ),
                    "Unassigned"
                  )}
                </strong>
              </div>

              <div>
                <span>Priority</span>
                <strong>{selectedTask.priority}</strong>
              </div>

              <div>
                <span>Deadline</span>
                <strong>{formatDate(selectedTask.due)}</strong>
              </div>

              <div>
                <span>Progress</span>
                <strong>{selectedTask.progress || 0}%</strong>
              </div>

              <div>
                <span>Current status</span>
                <strong>{selectedTask.status}</strong>
              </div>
            </div>

            <div className="task-detail-actions">
              <button
                className="tasks-button tasks-button-secondary"
                onClick={() =>
                  updateTaskStatus(
                    selectedTask,
                    "In Progress"
                  )
                }
              >
                Mark in progress
              </button>

              <button
                className="tasks-button tasks-button-primary"
                onClick={() =>
                  updateTaskStatus(
                    selectedTask,
                    "Completed"
                  )
                }
              >
                ✓ Mark completed
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="task-filter-field">
      <span>{label}</span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="ALL">
          All{" "}
          {label === "Status"
            ? "statuses"
            : `${label.toLowerCase()}s`}
        </option>

        {options.map((option) => (
          <option key={String(option)} value={option}>
            {typeof option === "object"
              ? displayValue(option)
              : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function FormField({ label, full = false, children }) {
  return (
    <label
      className={`tasks-form-field ${
        full ? "field-full" : ""
      }`}
    >
      <span>{label}</span>
      {children}
    </label>
  );
}

function ModalActions({ onCancel, submitText }) {
  return (
    <div className="tasks-modal-actions">
      <button
        type="button"
        className="tasks-button tasks-button-ghost"
        onClick={onCancel}
      >
        Cancel
      </button>

      <button
        type="submit"
        className="tasks-button tasks-button-primary"
      >
        {submitText} <span>→</span>
      </button>
    </div>
  );
}