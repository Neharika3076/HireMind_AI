import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import { ORGANIZATION_API_BASE_URL } from "../config/api";
import "../styles/Dashboard.css";
import "../styles/OrganizationPages.css";
import "../styles/EmployeeDashboard.css";

const API = ORGANIZATION_API_BASE_URL;

function greetingForHour(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getRoleLabel(role) {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized === "admin") return "Admin";
  if (normalized === "recruiter" || normalized === "executive") return "Executive";
  if (normalized === "manager") return "Manager";
  if (normalized === "hr") return "HR";
  return "Employee";
}

function taskProgress(task) {
  const explicitProgress = Number(task.progress);
  if (Number.isFinite(explicitProgress)) {
    return Math.max(0, Math.min(100, explicitProgress));
  }
  return String(task.status || "").toLowerCase() === "completed" ? 100 : 0;
}

function formatWorkTime(value) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatWorkDuration(seconds) {
  if (seconds == null || !Number.isFinite(Number(seconds))) return "Not checked in";
  const totalMinutes = Math.floor(Math.max(0, Number(seconds)) / 60);
  return `${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, "0")}m`;
}

export default function EmployeeDashboard() {
  const [user, setUser] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceDateKey, setAttendanceDateKey] = useState("");
  const [leaveSummary, setLeaveSummary] = useState(null);
  const [workdayError, setWorkdayError] = useState("");
  const [tasks, setTasks] = useState([]);
  const [taskError, setTaskError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const loadWorkday = useCallback(async () => {
    try {
      const attendanceResponse = await fetch(`${API}/attendance/today`, {
        credentials: "include",
      });
      const attendanceData = await attendanceResponse.json().catch(() => ({}));
      if (!attendanceResponse.ok) {
        throw new Error(attendanceData.message || "Unable to load today’s attendance.");
      }
      setTodayAttendance(attendanceData.ownRecord || null);
      setAttendanceDateKey(attendanceData.dateKey || "");

      const [year, month] = (attendanceData.dateKey || localDateKey(new Date()))
        .split("-")
        .map(Number);
      const calendarResponse = await fetch(`${API}/attendance/calendar?year=${year}&month=${month}`, {
        credentials: "include",
      });
      const calendarData = await calendarResponse.json().catch(() => ({}));
      if (!calendarResponse.ok) {
        throw new Error(calendarData.message || "Unable to load your leave balance.");
      }
      setLeaveSummary(calendarData.summary || null);
      setWorkdayError("");
    } catch (loadError) {
      setWorkdayError(loadError.message || "Unable to refresh attendance information.");
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function getJson(path) {
      const response = await fetch(`${API}${path}`, {
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = data.message || (
          response.status === 404 && path === "/tasks/my"
            ? "The task service is not available yet (GET /api/tasks/my returned 404)."
            : `Unable to load ${path}.`
        );
        throw new Error(message);
      }
      return data;
    }

    async function loadDashboard() {
      try {
        const profile = await getJson("/auth/me");
        if (!active) return;
        setUser(profile.user);
        loadWorkday();

        try {
          const taskData = await getJson("/tasks/my");
          if (active) setTasks(taskData.tasks || []);
        } catch (err) {
          if (active) setTaskError(err.message);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [loadWorkday]);

  useEffect(() => {
    if (!user) return undefined;
    const timer = window.setInterval(loadWorkday, 60_000);
    return () => window.clearInterval(timer);
  }, [loadWorkday, user]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="dashboard-shell">
        <Sidebar user={user} role={user?.role || "employee"} />
        <main className="workday-main employee-dashboard">
          <p className="employee-loading">Loading your workspace...</p>
        </main>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="dashboard-shell">
        <Sidebar user={user} role="employee" />
        <main className="workday-main employee-dashboard">
          <div className="employee-alert" role="alert">
            <span>{error}</span>
            <Link to="/login">Sign in</Link>
          </div>
        </main>
      </div>
    );
  }

  const completedTasks = tasks.filter(
    (task) => String(task.status || "").toLowerCase() === "completed"
  ).length;
  const openTasks = tasks.length - completedTasks;
  const averageProgress = tasks.length
    ? Math.round(
        tasks.reduce((total, task) => total + taskProgress(task), 0) /
          tasks.length
      )
    : 0;
  const workspacePath = `/${user?.role || "employee"}`;
  const displayName = user?.fullName?.trim().split(/\s+/)[0] || "there";
  const roleLabel = getRoleLabel(user?.role);
  const department = user?.department?.name || "Not assigned";
  const visibleTasks = tasks.slice(0, 4);
  const hasCheckedIn = Boolean(todayAttendance?.checkInAt);
  const isWorking = hasCheckedIn && !todayAttendance?.checkOutAt;
  const elapsedSeconds = hasCheckedIn
    ? todayAttendance.checkOutAt
      ? todayAttendance.durationSeconds ?? 0
      : Math.max(0, Math.floor((currentTime.getTime() - new Date(todayAttendance.checkInAt).getTime()) / 1000))
    : null;
  const workdayStatus = isWorking
    ? "Currently checked in"
    : todayAttendance?.checkOutAt
      ? "Workday completed"
      : "Ready for your workday";
  const monthLabel = attendanceDateKey
    ? new Date(Number(attendanceDateKey.slice(0, 4)), Number(attendanceDateKey.slice(5, 7)) - 1, 1)
      .toLocaleDateString([], { month: "long" })
    : currentTime.toLocaleDateString([], { month: "long" });

  return (
    <div className="dashboard-shell employee-shell">
      <Sidebar user={user} role={user?.role || "employee"} />

      <main className="workday-main employee-dashboard">
        <header className="employee-dashboard-header">
          <div>
            <span className="employee-eyebrow">YOUR WORKSPACE</span>
            <h1>
              {greetingForHour(currentTime.getHours())},{" "}
              <span>{displayName}.</span>
            </h1>
            <p>Here is your workday at a glance.</p>
          </div>
          <div className="employee-header-tools">
            <span className="employee-date-pill">
              <CalendarDays size={15} aria-hidden="true" />
              <span>
                Today <i>·</i>{" "}
                {currentTime.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </span>
            <span className="employee-live-dot" title="Workspace is active" />
          </div>
        </header>

        {error && (
          <div className="employee-alert" role="alert">
            {error}
          </div>
        )}

        <section className="employee-overview-grid">
          <article className="employee-profile-card">
            <div className="employee-avatar-wrap">
              <div className="employee-profile-avatar">
                {user?.fullName?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="employee-avatar-indicator" />
            </div>
            <h2>{user?.fullName || "Workspace User"}</h2>
            <p className="employee-profile-title">
              {user?.designation || user?.position || roleLabel}
            </p>
            <span className="employee-location">
              <MapPin size={13} aria-hidden="true" />
              {department}
            </span>
            <span className="employee-status-pill">
              <i />
              Workspace active
            </span>

            <div className="employee-profile-details">
              <div>
                <span>Role category</span>
                <strong>{roleLabel}</strong>
              </div>
              <div>
                <span>Employee ID</span>
                <strong>{user?.employeeId || "Not assigned"}</strong>
              </div>
              <div>
                <span>Department</span>
                <strong>{department}</strong>
              </div>
            </div>
            <Link className="employee-outline-link" to={`${workspacePath}/payroll`}>
              View my profile <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </article>

          <article className="employee-workday-card">
            <div className="employee-workday-top">
              <div>
                <span className="employee-eyebrow">CURRENT STATUS</span>
                <h2>
                  <i className={isWorking ? "is-checked-in" : ""} />
                  {workdayStatus}
                </h2>
                <p>{workdayError || (isWorking ? "Your check-in is recorded. Check out when your workday ends." : todayAttendance?.checkOutAt ? "Your check-in and checkout times are saved." : "Open attendance to record today’s check-in.")}</p>
              </div>
              <div className="employee-check-times">
                <span>Today’s check-in</span>
                <strong>{formatWorkTime(todayAttendance?.checkInAt)}</strong>
                <span>Check-out · {formatWorkTime(todayAttendance?.checkOutAt)}</span>
                <span className="employee-dashboard-leave-label">Leaves left · {monthLabel}</span>
                <strong className="employee-dashboard-leave-balance">
                  {leaveSummary ? `${leaveSummary.leaveRemaining} / 3` : "— / 3"}
                </strong>
              </div>
            </div>

            <div className="employee-workday-divider" />

            <div className="employee-workday-actions">
              <div>
                <span className="employee-work-hours-label">YOUR WORKDAY</span>
                <strong className="employee-work-hours">{formatWorkDuration(elapsedSeconds)}</strong>
                <p>
                  {isWorking
                    ? "Time on the clock updates automatically."
                    : todayAttendance?.checkOutAt
                      ? "Today’s attendance has been recorded."
                      : "Check in when you start; your attendance will appear here."}
                </p>
              </div>
              <Link
                className="employee-checkin-button"
                to={`${workspacePath}/attendance`}
              >
                <Clock3 size={16} aria-hidden="true" />
                Open attendance
              </Link>
            </div>

            <div className="employee-workday-note">
              <CheckCircle2 size={16} aria-hidden="true" />
              <span>
                {user?.email
                  ? `Signed in as ${user.email}`
                  : "Your workspace is ready."}
              </span>
              <small>Today</small>
            </div>
          </article>
        </section>

        <section className="employee-lower-grid">
          <Link
            className="employee-metric-card"
            to={`${workspacePath}/attendance`}
          >
            <span className="employee-metric-icon">
              <CalendarDays size={18} aria-hidden="true" />
            </span>
            <span className="employee-metric-link">
              Details <ArrowUpRight size={13} aria-hidden="true" />
            </span>
            <strong>{department}</strong>
            <span className="employee-metric-title">Department</span>
            <small>Your team and attendance workspace</small>
          </Link>

          <Link className="employee-metric-card" to={`${workspacePath}/tasks`}>
            <span className="employee-metric-icon">
              <CheckCircle2 size={18} aria-hidden="true" />
            </span>
            <span className="employee-metric-link">
              All tasks <ArrowUpRight size={13} aria-hidden="true" />
            </span>
            <strong>{taskError ? "—" : completedTasks}</strong>
            <span className="employee-metric-title">Completed work</span>
            <small>
              {taskError
                ? "Task data is currently unavailable"
                : `${openTasks} open of ${tasks.length} assigned ${tasks.length === 1 ? "task" : "tasks"}`}
            </small>
          </Link>

          <section className="employee-tasks-card">
            <div className="employee-tasks-heading">
              <div>
                <span className="employee-eyebrow">CURRENT TASKS</span>
                <h2>Your work in progress</h2>
              </div>
              <Link to={`${workspacePath}/tasks`}>
                Board <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </div>

            {taskError ? (
              <div className="employee-empty-tasks" role="status">
                <span className="employee-empty-icon">
                  <BriefcaseBusiness size={20} aria-hidden="true" />
                </span>
                <div>
                  <strong>Tasks are unavailable</strong>
                  <p>{taskError}</p>
                </div>
              </div>
            ) : visibleTasks.length ? (
              <div className="employee-task-list">
                {visibleTasks.map((task, index) => {
                  const progress = taskProgress(task);
                  return (
                    <article
                      className="employee-task-row"
                      key={task._id || task.id || `${task.title}-${index}`}
                    >
                      <div
                        className="employee-task-progress"
                        style={{ "--task-progress": `${progress}%` }}
                        aria-label={`${progress}% complete`}
                      >
                        <span>{progress}%</span>
                      </div>
                      <div className="employee-task-copy">
                        <strong>{task.title || task.name || "Untitled task"}</strong>
                        <span>
                          {task.project || task.category || "Assigned task"}
                        </span>
                      </div>
                      <span className="employee-task-status">
                        {task.status || "Pending"}
                      </span>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="employee-empty-tasks">
                <span className="employee-empty-icon">
                  <BriefcaseBusiness size={20} aria-hidden="true" />
                </span>
                <div>
                  <strong>No tasks assigned yet</strong>
                  <p>Your assigned work will appear here.</p>
                </div>
              </div>
            )}
            {tasks.length > visibleTasks.length && (
              <Link className="employee-more-tasks" to={`${workspacePath}/tasks`}>
                View all {tasks.length} tasks
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            )}
          </section>
        </section>

        <div className="employee-dashboard-footer">
          <span>
            <BriefcaseBusiness size={14} aria-hidden="true" />
            {user?.organization?.name || "Your organization"}
          </span>
          <span>{taskError ? "Task progress unavailable" : `${averageProgress}% average task progress`}</span>
        </div>
      </main>
    </div>
  );
}
