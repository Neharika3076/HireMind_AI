
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { isHiringDepartment } from "../utils/departmentAccess";

const navigation = {
  employee: [
    { label: "Employee Dashboard", path: "/employee/dashboard", icon: "⌂" },
    { label: "Tasks", path: "/employee/tasks", icon: "▤" },
    { label: "Attendance", path: "/employee/attendance", icon: "▦" },
    { label: "Payroll", path: "/employee/payroll", icon: "＄" },
  ],
  admin: [
    { label: "Admin Dashboard", path: "/admin/dashboard", icon: "⌂" },
    { label: "My Employee Dashboard", path: "/admin/my-dashboard", icon: "♙" },
    { label: "Tasks", path: "/admin/tasks", icon: "▤" },
    { label: "Attendance", path: "/admin/attendance", icon: "▦" },
    { label: "Payroll", path: "/admin/payroll", icon: "＄" },
    { label: "Directory", path: "/admin/directory", icon: "♙♙" },
    { label: "Add Member", path: "/admin/add-member", icon: "+" },
    { label: "Recruitment", path: "/admin/recruitment", icon: "◎" },
    { label: "Performance", path: "/admin/performance", icon: "↗" },
  ],
  recruiter: [
    { label: "Dashboard", path: "/recruiter/dashboard", icon: "⌂" },
    { label: "Directory", path: "/recruiter/directory", icon: "♙♙" },
    { label: "Tasks", path: "/recruiter/tasks", icon: "▤" },
    { label: "Attendance", path: "/recruiter/attendance", icon: "▦" },
    { label: "Payroll", path: "/recruiter/payroll", icon: "＄" },
    { label: "Recruitment", path: "/recruiter/recruitment", icon: "◎" },
  ],
  
  hr: [
    { label: "HR Dashboard", path: "/recruiter/dashboard", icon: "⌂" },
    { label: "Tasks", path: "/recruiter/tasks", icon: "▤" },
    { label: "Attendance", path: "/recruiter/attendance", icon: "▦" },
    { label: "Payroll", path: "/recruiter/payroll", icon: "＄" },
    { label: "Recruitment", path: "/recruiter/recruitment", icon: "◎" },
  ],

  manager: [
    { label: "Manager Dashboard", path: "/manager/dashboard", icon: "⌂" },
    { label: "Directory", path: "/manager/directory", icon: "♙♙" },
    { label: "Tasks", path: "/manager/tasks", icon: "▤" },
    { label: "Attendance", path: "/manager/attendance", icon: "▦" },
    { label: "Payroll", path: "/manager/payroll", icon: "＄" },
  ],
};

const roleLabels = {
  admin: "Admin",
  hr: "HR",
  recruiter: "Executive",
  manager: "Manager",
  employee: "Employee",
  executive: "Executive",
};

export default function Sidebar({ user, role }) {
  const navigate = useNavigate();
  const normalizedRole = role === "executive" ? "recruiter" : role;
  const links = [...(navigation[normalizedRole] || navigation.employee)];
  if (
    isHiringDepartment(user) &&
    normalizedRole !== "admin" &&
    !links.some((item) => item.label === "Recruitment")
  ) {
    links.push({ label: "Recruitment", path: "/recruiter/recruitment", icon: "◎" });
  }

  async function handleLogout() {
    try {
      await fetch("http://localhost:5000/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout failed:", error);
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
          <span>{roleLabels[role] || role || "Employee"}</span>
          <small>{user?.email || ""}</small>
        </div>
      </div>

      <div className="sidebar-section-label">WORKSPACE</div>

      <nav className="workday-nav">
        {links.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
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
