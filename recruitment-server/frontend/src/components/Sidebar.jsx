
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";

const navigation = [
  { label: "Dashboard", path: "dashboard", icon: "⌂", roles: ["admin", "employee", "recruiter"] },
  { label: "Directory", path: "directory", icon: "♙♙", roles: ["admin"] },
  { label: "Attendance", path: "attendance", icon: "▦", roles: ["admin", "employee"] },
  { label: "Tasks & Projects", path: "tasks", icon: "▤", roles: ["admin", "employee", "recruiter"] },
  { label: "Recruitment", path: "recruitment", icon: "◎", roles: ["admin", "recruiter"] },
  { label: "Add Member", path: "add-member", icon: "+", roles: ["admin"] },
  { label: "Payroll", path: "payroll", icon: "＄", roles: ["admin", "employee"] },
  { label: "Performance", path: "performance", icon: "↗", roles: ["admin"] },
];

export default function DashboardSidebar({ user, role }) {
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await fetch("http://localhost:5000/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <aside className="workday-sidebar">
      <NavLink to="/" className="workday-brand">
        <span className="brand-mark" />
        <span>KREW</span>
        <span className="brand-badge">WORKSPACE</span>
      </NavLink>

      <div className="workday-user-chip">
        <div className="workday-user-avatar">
          {(user?.fullName || "U").charAt(0).toUpperCase()}
        </div>
        <div className="workday-user-meta">
          <strong>{user?.fullName || "Workspace User"}</strong>
          <span>{role}</span>
          <small>{user?.email || ""}</small>
        </div>
      </div>

      <div className="sidebar-section-label">WORKSPACE</div>

      <nav className="workday-nav">
        {navigation
          .filter((item) => item.roles.includes(role))
          .map((item) => (
            <NavLink
              key={item.path}
              to={`/${role === "admin" ? "admin" : role === "recruiter" ? "recruiter" : "employee"}/${item.path}`}
              className={({ isActive }) =>
                `workday-nav-item ${isActive ? "active" : ""}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-plan">
          <span className="plan-dot" />
          <div>
            <strong>Workspace active</strong>
            <small>People, connected.</small>
          </div>
        </div>

        <button className="logout-button" onClick={handleLogout}>
          ↗ &nbsp; Sign out
        </button>
      </div>
    </aside>
  );
}
