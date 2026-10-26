
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import { isHiringDepartment } from "../utils/departmentAccess";
import { ORGANIZATION_API_BASE_URL } from "../config/api";
import "../styles/OrganizationPages.css";

const API = ORGANIZATION_API_BASE_URL;

function getRoleLabel(role) {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized === "executive" || normalized === "recruiter") return "Executive";
  if (normalized === "manager") return "Manager";
  if (normalized === "admin") return "Admin";
  if (normalized === "hr") return "HR";
  return "Employee";
}

function getReferenceId(value) {
  if (!value) return "";
  return String(value._id || value.id || value);
}

function MemberCard({ member }) {
  return (
    <article className="org-member-card" key={member._id}>
      <div className="org-member-card-top">
        <div className="org-large-avatar">
          {member.fullName?.charAt(0).toUpperCase() || "U"}
        </div>
        <span className={`org-status-badge ${(member.status || "active").toLowerCase()}`}>
          {member.status || "Active"}
        </span>
      </div>
      <h3>{member.fullName}</h3>
      <p>{member.designation || member.position || getRoleLabel(member.role)}</p>
      <div className="org-member-details">
        <span>{member.email}</span>
        <span>{member.department?.name || "Unassigned"}</span>
      </div>
      <div className="org-member-card-footer">
        <span className="org-count-pill">{getRoleLabel(member.role)}</span>
        <span>{member.employeeId || "Account"}</span>
      </div>
    </article>
  );
}

export default function Directory() {
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");
  const [role, setRole] = useState("All");
  const [view, setView] = useState("Members");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function getData(path) {
    const response = await fetch(`${API}${path}`, {
      credentials: "include",
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Could not load directory.");
    }
    return data;
  }

  async function loadDirectory() {
    setLoading(true);
    setError("");

    const [profileResult, memberResult, departmentResult] = await Promise.allSettled([
      getData("/auth/me"),
      getData("/users"),
      getData("/departments"),
    ]);

    const errors = [];
    if (profileResult.status === "fulfilled") {
      setUser(profileResult.value.user || null);
    } else {
      errors.push(`Profile: ${profileResult.reason.message}`);
    }

    if (memberResult.status === "fulfilled") {
      setMembers(memberResult.value.users || []);
    } else {
      setMembers([]);
      errors.push(`Members: ${memberResult.reason.message}`);
    }

    if (departmentResult.status === "fulfilled") {
      setDepartments(departmentResult.value.departments || []);
    } else {
      setDepartments([]);
      errors.push(`Departments: ${departmentResult.reason.message}`);
    }

    setError(errors.join(" "));
    setLoading(false);
  }

  useEffect(() => {
    loadDirectory();
  }, []);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const roleOrder = { admin: 0, executive: 1, recruiter: 1, manager: 2, hr: 3, employee: 4 };

    return members
      .filter((member) => {
        const departmentName = member.department?.name || "Unassigned";
        const memberRole = String(member.role || "").trim().toLowerCase();
        const roleLabel = getRoleLabel(memberRole);
        const searchable = [
          member.fullName,
          member.email,
          departmentName,
          roleLabel,
          memberRole,
          member.designation,
          member.position,
        ]
          .join(" ")
          .toLowerCase();

        const matchesRole =
          role === "All" ||
          memberRole === role ||
          (role === "executive" && (memberRole === "executive" || memberRole === "recruiter")) ||
          (role === "recruiter" && (memberRole === "executive" || memberRole === "recruiter"));

        return (
          searchable.includes(query) &&
          (department === "All" || departmentName === department) &&
          matchesRole
        );
      })
      .sort(
        (left, right) =>
          ((roleOrder[left.role] ?? 99) - (roleOrder[right.role] ?? 99)) ||
          left.fullName.localeCompare(right.fullName)
      );
  }, [members, search, department, role]);

  const isExecutive = ["executive", "recruiter"].includes(String(user?.role || "").toLowerCase());
  const isManager = String(user?.role || "").toLowerCase() === "manager";
  const executiveHierarchy = useMemo(() => {
    if (!isExecutive || !user) return null;
    const managers = members.filter((member) => member.role === "manager");
    const employees = filteredMembers.filter((member) => member.role === "employee");
    const visibleManagerIds = new Set(managers.map((member) => String(member._id)));
    const groupedEmployeeIds = new Set();
    const groups = managers.map((manager) => {
      const reports = employees.filter((employee) => getReferenceId(employee.manager) === String(manager._id));
      reports.forEach((employee) => groupedEmployeeIds.add(String(employee._id)));
      const managerMatches = filteredMembers.some((item) => String(item._id) === String(manager._id));
      return { manager, reports, managerMatches };
    }).filter((group) => group.managerMatches || group.reports.length);
    const directReports = employees.filter((employee) => getReferenceId(employee.manager) === String(user._id));
    directReports.forEach((employee) => groupedEmployeeIds.add(String(employee._id)));
    const otherReports = employees.filter((employee) => {
      const managerId = getReferenceId(employee.manager);
      return !groupedEmployeeIds.has(String(employee._id)) && (!managerId || !visibleManagerIds.has(managerId));
    });
    return { groups, directReports, otherReports };
  }, [filteredMembers, isExecutive, members, user]);

  return (
    <div className="dashboard-shell">
      <Sidebar user={user} role={user?.role} />

      <main className="workday-main org-page">
        <header className="org-page-header">
          <div>
            <span className="org-eyebrow">KREW / WORKSPACE</span>
            <h1>
              Company <span>Directory.</span>
            </h1>
            <p>{isExecutive ? "Managers and employees in your reporting hierarchy." : isManager ? "Employees who report directly to you." : "People and departments from your organization database."}</p>
          </div>
          <span className="org-count-pill">
            {departments.length} departments
          </span>
        </header>

        {error && (
          <div className="org-feedback" role="alert">
            {error}
            <button type="button" onClick={loadDirectory}>
              Retry ↻
            </button>
          </div>
        )}

        {loading ? (
          <p>Loading directory...</p>
        ) : (
          <>
            <section className="org-stats-grid directory-stats-grid">
              <article className="org-stat-card">
                <span>ADMINS</span>
                <strong>
                  {members.filter((member) => member.role === "admin").length}
                </strong>
              </article>
              <article className="org-stat-card">
                <span>HR &amp; HIRING DEPARTMENT</span>
                <strong>
                  {members.filter(isHiringDepartment).length}
                </strong>
              </article>
              <article className="org-stat-card">
                <span>EXECUTIVES</span>
                <strong>
                  {members.filter((member) => member.role === "executive" || member.role === "recruiter").length}
                </strong>
              </article>
              <article className="org-stat-card">
                <span>MANAGERS</span>
                <strong>
                  {members.filter((member) => member.role === "manager").length}
                </strong>
              </article>
              <article className="org-stat-card">
                <span>EMPLOYEES</span>
                <strong>
                  {members.filter((member) => member.role === "employee").length}
                </strong>
              </article>
              <article className="org-stat-card">
                <span>DEPARTMENTS</span>
                <strong>{departments.length}</strong>
              </article>
            </section>

            <section className="org-card">
              <div className="org-section-heading">
                <div>
                  <span className="org-eyebrow">PEOPLE & STRUCTURE</span>
                  <h2>{isExecutive ? "Your reporting hierarchy" : isManager ? "Your direct reports" : "Explore your organization"}</h2>
                </div>
                <button
                  className="org-secondary-btn"
                  onClick={() => {
                    setSearch("");
                    setDepartment("All");
                    setRole("All");
                  }}
                >
                  Reset filters
                </button>
              </div>

              <div className="org-toolbar">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, role..."
                  aria-label="Search directory"
                />

                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <option value="All">All departments</option>
                  {departments.map((item) => (
                    <option key={item._id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>

                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="All">All roles</option>
                  <option value="executive">Executive</option>
                  <option value="manager">Manager</option>
                  <option value="hr">HR</option>
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="org-view-switch">
                {["Members", "Departments"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={view === item ? "selected" : ""}
                    onClick={() => setView(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {view === "Members" ? (
                isExecutive ? (
                  <div className="directory-hierarchy">
                    {executiveHierarchy.groups.map(({ manager, reports }) => (
                      <section className="org-card directory-team-group" key={manager._id}>
                        <div className="org-section-heading">
                          <div><span className="org-eyebrow">MANAGER</span><h3>{manager.fullName}</h3></div>
                          <span className="org-count-pill">{reports.length} employees</span>
                        </div>
                        <div className="org-member-grid"><MemberCard member={manager} />{reports.map((member) => <MemberCard key={member._id} member={member} />)}</div>
                      </section>
                    ))}
                    {executiveHierarchy.directReports.length > 0 && (
                      <section className="org-card directory-team-group">
                        <div className="org-section-heading"><div><span className="org-eyebrow">REPORTING TO YOU</span><h3>Direct reports</h3></div><span className="org-count-pill">{executiveHierarchy.directReports.length} employees</span></div>
                        <div className="org-member-grid">{executiveHierarchy.directReports.map((member) => <MemberCard key={member._id} member={member} />)}</div>
                      </section>
                    )}
                    {executiveHierarchy.otherReports.length > 0 && (
                      <section className="org-card directory-team-group">
                        <div className="org-section-heading"><div><span className="org-eyebrow">TEAM MEMBERS</span><h3>Other reports</h3></div><span className="org-count-pill">{executiveHierarchy.otherReports.length} employees</span></div>
                        <div className="org-member-grid">{executiveHierarchy.otherReports.map((member) => <MemberCard key={member._id} member={member} />)}</div>
                      </section>
                    )}
                    {!filteredMembers.length && <p className="org-empty">No matching members found.</p>}
                  </div>
                ) : (
                  <div className="org-member-grid">
                    {filteredMembers.map((member) => <MemberCard key={member._id} member={member} />)}
                    {!filteredMembers.length && <p className="org-empty">No matching members found.</p>}
                  </div>
                )
              ) : (
                <div className="org-department-grid">
                  {departments
                    .filter(
                      (item) =>
                        department === "All" || item.name === department
                    )
                    .map((item) => {
                      const people = members.filter(
                        (member) =>
                          String(
                            member.department?._id ||
                              member.department ||
                              ""
                          ) === String(item._id)
                      );

                      return (
                        <article
                          className="org-department-card"
                          key={item._id}
                        >
                          <div className="org-department-top">
                            <span className="org-card-icon">▦</span>
                            <span className="org-count-pill">
                              {people.length} members
                            </span>
                          </div>
                          <h3>{item.name}</h3>
                          <p>{item.description || "No description."}</p>
                          <div className="org-member-avatars">
                            {people.slice(0, 4).map((person) => (
                              <span key={person._id} title={person.fullName}>
                                {person.fullName?.charAt(0).toUpperCase()}
                              </span>
                            ))}
                          </div>
                        </article>
                      );
                    })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
