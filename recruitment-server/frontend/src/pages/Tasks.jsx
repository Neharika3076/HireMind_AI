import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "../styles/Tasks.css";

const initialProjects = [
  {
    id: 1,
    name: "Krew Platform",
    code: "KREW-01",
    department: "Engineering",
    progress: 72,
    status: "In Progress",
    members: 4,
    color: "teal",
  },
  {
    id: 2,
    name: "Recruitment Portal",
    code: "HR-02",
    department: "Talent",
    progress: 45,
    status: "In Progress",
    members: 3,
    color: "purple",
  },
  {
    id: 3,
    name: "Employee Experience",
    code: "EMP-03",
    department: "Operations",
    progress: 100,
    status: "Completed",
    members: 5,
    color: "lime",
  },
];


const emptyProject = {
  name: "",
  code: "",
  description: "",
  department: "Engineering",
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

export default function Tasks() {
  const location = useLocation();

const [user, setUser] = useState(null);
const [projects, setProjects] = useState([]);
const [tasks, setTasks] = useState([]);
const [profileError, setProfileError] = useState("");

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

  useEffect(() => {
  let active = true;

  async function fetchTasks() {
    try {
      const response = await fetch("http://localhost:5000/api/tasks", {
        credentials: "include",
      });

      const data = await response.json();
      console.log("Tasks received from backend:", data.tasks);
      console.log("Total tasks received:", data.tasks?.length);

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



  
useEffect(() => {
  let active = true;

  async function fetchProjects() {
    try {
      const response = await fetch("http://localhost:5000/api/projects", {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load projects.");
      }

      if (active) {
const savedProjects = (data.projects || []).map((project) => ({
    ...project,
    id: project._id,
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
}, []);




  const departments = [
    "Engineering",
    "Talent",
    "Operations",
    "Design",
    "Marketing",
    "Finance",
  ];

  const people = [
    "Aarav Sharma",
    "Meera Kapoor",
    "Rohan Mehta",
    "Isha Verma",
  ];

  const uniqueValues = (key) => [
    ...new Set(tasks.map((task) => task[key]).filter(Boolean)),
  ];

  const filteredTasks = useMemo(() => {
    const query = search.toLowerCase().trim();

    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.project.toLowerCase().includes(query) ||
        task.team.toLowerCase().includes(query);

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

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(
    (task) => task.status === "Completed"
  ).length;
  const inProgressTasks = tasks.filter(
    (task) => task.status === "In Progress"
  ).length;
  const overdueTasks = tasks.filter(
    (task) =>
      task.status !== "Completed" &&
      task.due &&
      new Date(`${task.due}T23:59:59`) < new Date()
  ).length;

  function openModal(type) {
  setFeedback("");

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

    setTaskForm((current) => ({
      ...current,
      project: selectedProject,
    }));
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


  if (!name || !code) {
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
    const response = await fetch("http://localhost:5000/api/projects", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newProject),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to create project.");
    }

    const savedProject = {
      ...data.project,
      id: data.project._id,
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
    if (!projects.some((project) => project.name === taskForm.project)) {
    setFeedback("Please select an existing project before creating a task.");
    return;
  }

  if (!taskForm.title.trim()) {
    setFeedback("Task title is required.");
    return;
  }

  const newTask = {
    project: taskForm.project,
    title: taskForm.title.trim(),
    team:
      projects.find((project) => project.name === taskForm.project)
        ?.department || "Engineering",
    manager: taskForm.lead || "Unassigned",
    lead: taskForm.lead || "Unassigned",
    member: taskForm.member || "Unassigned",
    priority: taskForm.priority,
    due: taskForm.due,
    progress: 0,
    status: "Assigned",
    description: taskForm.description,
    category: taskForm.category,
  };

  try {
    const response = await fetch("http://localhost:5000/api/tasks", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newTask),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to create task.");
    }

    setTasks((current) => [
      { ...data.task, id: data.task._id },
      ...current,
    ]);

    setTaskForm(emptyTask);
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
          ? { ...item, members: Math.max(item.members, members.length) }
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
      throw new Error(data.message || "Failed to update task status.");
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

    return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="dashboard-shell tasks-shell">
      <Sidebar
        user={user}
        role={user?.role || location.pathname.split("/")[1] || "employee"}
      />

      <main className="workday-main tasks-main">
        {profileError && <div className="tasks-feedback" role="alert">{profileError}</div>}
        <header className="tasks-page-header">
          <div>
            <div className="tasks-eyebrow">KREW / WORK MANAGEMENT</div>
            <h1>
              Projects <span>&</span> Tasks<span className="title-dot">.</span>
            </h1>
            <p>
              Coordinate projects, organize your teams, and keep every
              deliverable moving forward.
            </p>
          </div>

          <div className="tasks-header-actions">
            <button
              className="tasks-button tasks-button-secondary"
              onClick={() => openModal("team")}
            >
              <span>♧</span> Assign team
            </button>
            <button
              className="tasks-button tasks-button-primary"
              onClick={() => openModal("project")}
            >
              <span>＋</span> Create project
            </button>
          </div>
        </header>

        {feedback && (
          <div className="tasks-feedback" role="status">
            {feedback}
            <button onClick={() => setFeedback("")} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}

        <section className="tasks-hero">
          <div className="tasks-hero-copy">
            <span className="tasks-hero-kicker">YOUR WORKSPACE OVERVIEW</span>
            <h2>Make progress visible.</h2>
            <p>
              One place to track delivery, understand priorities, and keep
              everyone aligned.
            </p>
            <button
              className="tasks-button tasks-button-light"
              onClick={() => openModal("task")}
            >
              + Add a deliverable <span>→</span>
            </button>
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
              <span className="metric-icon metric-icon-teal">▦</span>
              <span className="metric-caption">ALL PROJECTS</span>
            </div>
            <strong>{projects.length.toString().padStart(2, "0")}</strong>
            <span className="metric-footer">Across your workspace</span>
          </article>

          <article className="tasks-metric">
            <div className="metric-top">
              <span className="metric-icon metric-icon-purple">◇</span>
              <span className="metric-caption">TOTAL TASKS</span>
            </div>
            <strong>{totalTasks.toString().padStart(2, "0")}</strong>
            <span className="metric-footer">Assigned deliverables</span>
          </article>

          <article className="tasks-metric">
            <div className="metric-top">
              <span className="metric-icon metric-icon-lime">✓</span>
              <span className="metric-caption">COMPLETED</span>
            </div>
            <strong>{completedTasks.toString().padStart(2, "0")}</strong>
            <span className="metric-footer">
              {totalTasks
                ? Math.round((completedTasks / totalTasks) * 100)
                : 0}
              % of all tasks
            </span>
          </article>

          <article className="tasks-metric">
            <div className="metric-top">
              <span className="metric-icon metric-icon-orange">◷</span>
              <span className="metric-caption">OVERDUE TASKS</span>
            </div>
            <strong>{overdueTasks.toString().padStart(2, "0")}</strong>
            <span className="metric-footer">Need your attention</span>
          </article>
        </section>

        <section className="tasks-section">
          <div className="tasks-section-heading">
            <div>
              <span className="tasks-section-kicker">YOUR PORTFOLIO</span>
              <h2>Active projects</h2>
              <p>See how work is progressing across your teams.</p>
            </div>

            <span className="tasks-count-badge">
              {projects.length} projects
            </span>
          </div>

          <div className="project-grid">
            {projects.map((project) => (
              <article className="project-card" key={project.id}>
                <div className="project-card-top">
                  <span className={`project-symbol ${project.color}`}>
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

                <span className="project-code">{project.code}</span>
                <h3>{project.name}</h3>
                <p className="project-department">{project.department}</p>

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
                  <span>♙ {project.members} members</span>
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

            <button
              className="project-create-card"
              onClick={() => openModal("project")}
            >
              <span className="project-create-icon">＋</span>
              <strong>Create a project</strong>
              <span>Start organizing your next initiative.</span>
            </button>
          </div>
        </section>

        <section className="tasks-section work-queue" id="work-queue">
          <div className="tasks-section-heading queue-heading">
            <div>
              <span className="tasks-section-kicker">DELIVERY TRACKER</span>
              <h2>Work queue</h2>
              <p>Search, filter, and manage deliverables in one place.</p>
            </div>

            <button
              className="tasks-button tasks-button-primary"
              onClick={() => openModal("task")}
            >
              ＋ Add deliverable
            </button>
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
              options={departments}
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
              Showing <strong>{filteredTasks.length}</strong> of {tasks.length}{" "}
              tasks
            </span>
            <span>{inProgressTasks} tasks currently in progress</span>
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
                      <div className="table-task-title">{task.title}</div>
                      <div className="table-task-project">{task.project}</div>
                    </td>

                    <td>
                      <div className="table-team">{task.team}</div>
                      <div className="table-team-member">{task.member}</div>
                    </td>

                    <td>
                      <span
                        className={`priority-badge priority-${task.priority
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        <i />
                        {task.priority}
                      </span>
                    </td>

                    <td className="task-due-date">{formatDate(task.due)}</td>

                    <td>
                      <div className="table-progress">
                        <div className="tasks-progress-track">
                          <span style={{ width: `${task.progress}%` }} />
                        </div>
                        <strong>{task.progress}%</strong>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`task-status status-${task.status
                          .toLowerCase()
                          .replaceAll(" ", "-")}`}
                      >
                        <i />
                        {task.status}
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
                    <td colSpan="7">
                      <div className="tasks-empty-state">
                        <span>⌕</span>
                        <strong>No matching tasks</strong>
                        <p>Try changing your search or filters.</p>
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
        <div className="tasks-modal-backdrop" onMouseDown={closeModal}>
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
              <form className="tasks-form" onSubmit={handleCreateProject}>
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
                      value={projectForm.department}
                      onChange={(event) =>
                        setProjectForm({
                          ...projectForm,
                          department: event.target.value,
                        })
                      }
                    >
                      {departments.map((department) => (
                        <option key={department}>{department}</option>
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
              <form className="tasks-form" onSubmit={handleCreateTask}>
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
                      }))
                    }
                  >
                    <option value="" disabled>
                      Select a project
                    </option>

                    {projects.map((project) => (
                      <option key={project.id} value={project.name}>
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

                  <FormField label="Team lead">
                    <select
                      value={taskForm.lead}
                      onChange={(event) =>
                        setTaskForm({
                          ...taskForm,
                          lead: event.target.value,
                        })
                      }
                    >
                      <option value="">Unassigned</option>
                      {people.map((person) => (
                        <option key={person}>{person}</option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Assigned member">
                    <select
                      value={taskForm.member}
                      onChange={(event) =>
                        setTaskForm({
                          ...taskForm,
                          member: event.target.value,
                        })
                      }
                    >
                      <option value="">Unassigned</option>
                      {people.map((person) => (
                        <option key={person}>{person}</option>
                      ))}
                    </select>
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
              <form className="tasks-form" onSubmit={handleAssignTeam}>
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
                      <option key={project.id}>{project.name}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Project members">
                  <div className="tasks-selection-list">
                    {people.map((person) => (
                      <label key={person}>
                        <input
                          type="checkbox"
                          checked={teamForm.members.includes(person)}
                          onChange={(event) =>
                            setTeamForm({
                              ...teamForm,
                              members: event.target.checked
                                ? [...teamForm.members, person]
                                : teamForm.members.filter(
                                    (member) => member !== person
                                  ),
                            })
                          }
                        />
                        <span className="selection-avatar">
                          {person.charAt(0)}
                        </span>
                        <span>{person}</span>
                      </label>
                    ))}
                  </div>
                </FormField>

                <FormField label="Responsible manager">
                  <select
                    value={teamForm.managers[0] || ""}
                    onChange={(event) =>
                      setTeamForm({
                        ...teamForm,
                        managers: event.target.value
                          ? [event.target.value]
                          : [],
                      })
                    }
                  >
                    <option value="">No manager selected</option>
                    {people.map((person) => (
                      <option key={person}>{person}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Team lead">
                  <select
                    value={teamForm.leads[0] || ""}
                    onChange={(event) =>
                      setTeamForm({
                        ...teamForm,
                        leads: event.target.value ? [event.target.value] : [],
                      })
                    }
                  >
                    <option value="">No lead selected</option>
                    {people.map((person) => (
                      <option key={person}>{person}</option>
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
                <span className="tasks-section-kicker">TASK DETAILS</span>
                <h2 id="task-detail-title">{selectedTask.title}</h2>
                <p>{selectedTask.project}</p>
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
                <strong>{selectedTask.team}</strong>
              </div>
              <div>
                <span>Assigned member</span>
                <strong>{selectedTask.member}</strong>
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
                <strong>{selectedTask.progress}%</strong>
              </div>
              <div>
                <span>Current status</span>
                <strong>{selectedTask.status}</strong>
              </div>
            </div>

            <div className="task-detail-actions">
              <button
                className="tasks-button tasks-button-secondary"
                onClick={() => updateTaskStatus(selectedTask, "In Progress")}
              >
                Mark in progress
              </button>
              <button
                className="tasks-button tasks-button-primary"
                onClick={() => updateTaskStatus(selectedTask, "Completed")}
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
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="ALL">All {label === "Status" ? "statuses" : label.toLowerCase() + "s"}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function FormField({ label, full = false, children }) {
  return (
    <label className={`tasks-form-field ${full ? "field-full" : ""}`}>
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
      <button type="submit" className="tasks-button tasks-button-primary">
        {submitText} <span>→</span>
      </button>
    </div>
  );
}