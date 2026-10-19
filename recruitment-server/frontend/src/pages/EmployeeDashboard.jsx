
import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import "../styles/Dashboard.css";

export default function EmployeeDashboard() {
  const [checkedIn, setCheckedIn] = useState(false);

  // Demo profile; later load the logged-in user from /api/auth/me.
  const user = {
    fullName: "Aarav Sharma",
    email: "aarav@example.com",
    employeeId: "EMP-1001",
    department: "Engineering",
    designation: "Software Engineer",
    location: "Office",
  };

  const tasks = [
    { title: "Review sprint requirements", project: "Project Atlas", progress: 100, status: "Completed" },
    { title: "Implement dashboard updates", project: "Krew Platform", progress: 65, status: "In progress" },
    { title: "Prepare weekly progress report", project: "Team Operations", progress: 20, status: "In progress" },
  ];

  const completed = tasks.filter((task) => task.progress === 100).length;

  return (
    <div className="dashboard-shell">
      <Sidebar user={user} role="employee" />

      <main className="workday-main">
        <header className="dashboard-header">
          <div>
            <div className="eyebrow">KREW / MY WORKSPACE</div>
            <h1>My Dashboard<span>.</span></h1>
            <p>Your work, progress, and personal details in one place.</p>
          </div>
          <span className={`status-pill ${checkedIn ? "checked-in" : ""}`}>
            ● {checkedIn ? "Checked in" : "Not checked in"}
          </span>
        </header>

        <section className="welcome-panel employee-welcome">
          <div>
            <span className="welcome-kicker">YOUR PERSONAL WORKSPACE</span>
            <h2>Welcome back, {user.fullName.split(" ")[0]}.</h2>
            <p>Small steps every day make great work happen.</p>
            <button className="btn btn-light" onClick={() => setCheckedIn((value) => !value)}>
              {checkedIn ? "Check out" : "Check in"} <span>→</span>
            </button>
          </div>
          <div className="employee-hero-avatar">{user.fullName.charAt(0)}</div>
        </section>

        <section className="stat-cards-grid employee-stats">
          <article className="stat-card"><div className="stat-card-label">ATTENDANCE STATUS</div><div className="stat-card-value">{checkedIn ? "On duty" : "Offline"}</div><div className="stat-card-delta">Demo interaction</div></article>
          <article className="stat-card"><div className="stat-card-label">ASSIGNED TASKS</div><div className="stat-card-value">{tasks.length}</div><div className="stat-card-delta">Current task list</div></article>
          <article className="stat-card"><div className="stat-card-label">COMPLETED TASKS</div><div className="stat-card-value">{completed}</div><div className="stat-card-delta">Out of {tasks.length} tasks</div></article>
          <article className="stat-card"><div className="stat-card-label">TEAM</div><div className="stat-card-value">{user.department}</div><div className="stat-card-delta">Your department</div></article>
        </section>

        <section className="content-grid">
          <article className="dash-panel">
            <div className="panel-heading"><div><span className="eyebrow">PERSONAL DETAILS</span><h3>My profile</h3></div><span className="profile-symbol">♙</span></div>
            <div className="profile-identity">
              <div className="employee-avatar">{user.fullName.charAt(0)}</div>
              <div><h3>{user.fullName}</h3><p>{user.designation}</p></div>
            </div>
            <div className="summary-line"><span>Employee ID</span><strong>{user.employeeId}</strong></div>
            <div className="summary-line"><span>Work email</span><strong>{user.email}</strong></div>
            <div className="summary-line"><span>Department</span><strong>{user.department}</strong></div>
            <div className="summary-line"><span>Location</span><strong>{user.location}</strong></div>
          </article>

          <article className="dash-panel">
            <div className="panel-heading"><div><span className="eyebrow">YOUR PROGRESS</span><h3>Task completion</h3></div><span className="profile-symbol">↗</span></div>
            <div className="progress-number">{Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length)}<span>%</span></div>
            <p className="muted-text">Average progress across your demo tasks.</p>
            <div className="progress-track"><span style={{ width: `${tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length}%` }} /></div>
            <div className="summary-line"><span>Completed tasks</span><strong>{completed} of {tasks.length}</strong></div>
            <div className="summary-line"><span>Current status</span><strong className="text-green">On track</strong></div>
          </article>
        </section>

        <section className="dash-panel">
          <div className="panel-heading"><div><span className="eyebrow">WHAT'S ON YOUR PLATE</span><h3>My tasks & projects</h3></div><span className="muted-text">{tasks.length} assigned</span></div>
          <div className="task-list">
            {tasks.map((task) => (
              <article className="task-item" key={task.title}>
                <div className="task-marker">{task.progress === 100 ? "✓" : "↗"}</div>
                <div className="task-main"><strong>{task.title}</strong><small>{task.project}</small><div className="progress-track"><span style={{ width: `${task.progress}%` }} /></div></div>
                <div className="task-meta"><span className={`member-status ${task.progress === 100 ? "active" : "pending"}`}>{task.status}</span><strong>{task.progress}%</strong></div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
