
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { isHiringDepartment } from "../utils/departmentAccess";
import { ORGANIZATION_API_BASE_URL } from "../config/api";
import "../styles/Dashboard.css";
import "../styles/OrganizationPages.css";

const API = ORGANIZATION_API_BASE_URL;

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const hrCount = members.filter(isHiringDepartment).length;
  const executiveCount = members.filter((member) => member.role === "recruiter" || member.role === "executive").length;
  const managerCount = members.filter((member) => member.role === "manager").length;
  const employeeCount = members.filter((member) => member.role === "employee").length;

  useEffect(() => {
    let active = true;

    async function getJson(path) {
      const response = await fetch(`${API}${path}`, {
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Unable to load ${path}`);
      }

      return data;
    }

    async function loadDashboard() {
      try {
        const profile = await getJson("/auth/me");
        if (!active) return;
        setUser(profile.user);

        const results = await Promise.allSettled([
          getJson("/users"),
          getJson("/departments"),
          getJson("/tasks/my"),
        ]);

        if (!active) return;

        if (results[0].status === "fulfilled") {
          setMembers(results[0].value.users || []);
        }

        if (results[1].status === "fulfilled") {
          setDepartments(results[1].value.departments || []);
        }

        if (results[2].status === "fulfilled") {
          setTasks(results[2].value.tasks || []);
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
  }, []);

  if (loading) {
    return <main className="workday-main"><p>Loading admin workspace...</p></main>;
  }

  return (
    <div className="dashboard-shell">
      <Sidebar user={user} role={user?.role || "admin"} />

      <main className="workday-main org-page dashboard-page admin-dashboard-page">
        <header className="org-page-header">
          <div>
            <span className="org-eyebrow">ADMIN WORKSPACE</span>
            <h1>
              Welcome, <span>{user?.fullName || "Admin"}.</span>
            </h1>
            <p>Manage your organization and access your own employee workspace.</p>
          </div>
          <div className="admin-dashboard-date">
            <span>ORGANIZATION OVERVIEW</span>
            <strong>{new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</strong>
          </div>
        </header>

        {error && (
          <div className="org-feedback" role="alert">
            {error}
          </div>
        )}

        <section className="org-stats-grid">
          <article className="org-stat-card">
            <span>ALL TEAM MEMBERS</span>
            <strong>{members.length}</strong>
            <Link to="/admin/directory">View directory →</Link>
          </article>

          <article className="org-stat-card">
            <span>HR &amp; HIRING DEPARTMENT</span>
            <strong>{hrCount}</strong>
            <Link to="/admin/directory">View HR &amp; Hiring team →</Link>
          </article>

          <article className="org-stat-card">
            <span>EXECUTIVES</span>
            <strong>{executiveCount}</strong>
            <Link to="/admin/directory">View executives →</Link>
          </article>

          <article className="org-stat-card">
            <span>MANAGERS</span>
            <strong>{managerCount}</strong>
            <Link to="/admin/directory">View managers →</Link>
          </article>

          <article className="org-stat-card">
            <span>EMPLOYEES</span>
            <strong>{employeeCount}</strong>
            <Link to="/admin/directory">View employees →</Link>
          </article>

          <article className="org-stat-card">
            <span>DEPARTMENTS</span>
            <strong>{departments.length}</strong>
            <Link to="/admin/add-member">Manage departments →</Link>
          </article>

          <article className="org-stat-card">
            <span>YOUR TASKS</span>
            <strong>{tasks.length}</strong>
            <Link to="/admin/my-tasks">Open personal tasks →</Link>
          </article>
        </section>

        <section className="org-card">
          <div className="org-section-heading">
            <div>
              <span className="org-eyebrow">ORGANIZATION MANAGEMENT</span>
              <h2>Your organization at a glance</h2>
              <p className="admin-section-copy">Build your team, keep daily operations moving, and review hiring in one place.</p>
            </div>
          </div>

          <div className="org-form-grid">
            <Link className="org-card" to="/admin/add-member">
              <span className="admin-action-icon">＋</span>
              <span className="admin-action-label">PEOPLE</span>
              <h3>Add a team member</h3>
              <p>Add members with the right role and department.</p>
            </Link>

            <Link className="org-card" to="/admin/directory">
              <span className="admin-action-icon">♙</span>
              <span className="admin-action-label">ORGANIZATION</span>
              <h3>Company directory</h3>
              <p>Browse people by role and department.</p>
            </Link>

            <Link className="org-card" to="/admin/attendance">
              <span className="admin-action-icon">▦</span>
              <span className="admin-action-label">WORKFORCE</span>
              <h3>Attendance</h3>
              <p>Review attendance across your organization.</p>
            </Link>

            <Link className="org-card" to="/admin/tasks">
              <span className="admin-action-icon">▤</span>
              <span className="admin-action-label">OPERATIONS</span>
              <h3>Team tasks</h3>
              <p>Assign work and track team progress.</p>
            </Link>

            <Link className="org-card" to="/admin/recruitment">
              <span className="admin-action-icon">◎</span>
              <span className="admin-action-label">HIRING</span>
              <h3>Recruitment</h3>
              <p>Manage open roles, applicants, and interviews.</p>
            </Link>
          </div>
        </section>

        <section className="org-card">
          <div className="org-section-heading">
            <div>
              <span className="org-eyebrow">YOUR EMPLOYEE WORKSPACE</span>
              <h2>Your own profile and work</h2>
            </div>
            <Link to="/admin/my-dashboard">Open my workspace →</Link>
          </div>

          <div className="org-member-details">
            <span><strong>Name:</strong> {user?.fullName || "—"}</span>
            <span><strong>Email:</strong> {user?.email || "—"}</span>
            <span><strong>Employee ID:</strong> {user?.employeeId || "Not assigned"}</span>
            <span>
              <strong>Department:</strong>{" "}
              {user?.department?.name || "Not assigned"}
            </span>
          </div>

          <div className="org-form-actions">
            <Link className="org-primary-btn" to="/admin/my-dashboard">
              My Dashboard
            </Link>
            <Link className="org-secondary-btn" to="/admin/my-tasks">
              My Tasks
            </Link>
            <Link className="org-secondary-btn" to="/admin/my-attendance">
              My Attendance
            </Link>
            <Link className="org-secondary-btn" to="/admin/my-payroll">
              My Payroll
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
