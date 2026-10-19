
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "../styles/Dashboard.css";

const initialMembers = [
  { id: "1", fullName: "Aarav Sharma", email: "aarav@example.com", role: "employee", department: "Engineering", status: "Active" },
  { id: "2", fullName: "Meera Kapoor", email: "meera@example.com", role: "recruiter", department: "Talent", status: "Active" },
  { id: "3", fullName: "Rohan Mehta", email: "rohan@example.com", role: "employee", department: "Design", status: "Active" },
  { id: "4", fullName: "Isha Verma", email: "isha@example.com", role: "employee", department: "Marketing", status: "Pending" },
];

function StatCard({ label, value, note, icon, color }) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span className="stat-card-label">{label}</span>
        <span className={`stat-icon ${color}`}>{icon}</span>
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-delta">{note}</div>
    </article>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [members, setMembers] = useState(initialMembers);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    role: "employee",
    department: "",
  });

  // Demo user until the authenticated profile is loaded from the API.
  const user = {
    fullName: "Workspace Admin",
    email: "admin@example.com",
  };

  const filteredMembers = useMemo(() => {
    const query = search.toLowerCase();
    return members.filter((member) =>
      [member.fullName, member.email, member.role, member.department]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [members, search]);

  function updateForm(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  function addDemoMember(event) {
    event.preventDefault();
    setNotice("");

    if (!form.fullName.trim() || !form.email.trim()) {
      setNotice("Enter the member's name and email.");
      return;
    }

    if (members.some((m) => m.email.toLowerCase() === form.email.trim().toLowerCase())) {
      setNotice("This email is already in the demo directory.");
      return;
    }

    setMembers((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        role: form.role,
        department: form.department.trim() || "Unassigned",
        status: "Active",
      },
    ]);

    setForm({ fullName: "", email: "", role: "employee", department: "" });
    setShowForm(false);
    setActiveTab("directory");
    setNotice("Demo member added. This has not been saved to MongoDB.");
  }

  const departments = new Set(members.map((m) => m.department)).size;

  return (
    <div className="dashboard-shell">
      <Sidebar user={user} role="admin" />

      <main className="workday-main">
        <header className="dashboard-header">
          <div>
            <div className="eyebrow">KREW / ADMINISTRATION</div>
            <h1>Admin Command Center<span>.</span></h1>
            <p>Manage your people, organization, and hiring workspace.</p>
          </div>
          <span className="role-badge">✦ ADMIN CONSOLE</span>
        </header>

        <div className="dashboard-toolbar">
          <div className="dashboard-tabs">
            <button
              className={activeTab === "overview" ? "dash-tab active" : "dash-tab"}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button
              className={activeTab === "directory" ? "dash-tab active" : "dash-tab"}
              onClick={() => setActiveTab("directory")}
            >
              Directory
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Add member
          </button>
        </div>

        {notice && <div className="notice-banner">{notice}</div>}

        {activeTab === "overview" && (
          <>
            <section className="welcome-panel">
              <div>
                <span className="welcome-kicker">YOUR WORKSPACE AT A GLANCE</span>
                <h2>Good to have you here, {user.fullName.split(" ")[0]}.</h2>
                <p>Your team's people and hiring activity, in one place.</p>
              </div>
              <div className="welcome-orb">K</div>
            </section>

            <section className="stat-cards-grid">
              <StatCard label="ORGANIZATIONS" value="1" note="Current workspace" icon="▦" color="violet" />
              <StatCard label="ACTIVE PROJECTS" value="8" note="Demo statistic" icon="◈" color="blue" />
              <StatCard label="TEAM MEMBERS" value={members.length} note="Listed in this demo" icon="♙" color="green" />
              <StatCard label="DEPARTMENTS" value={departments} note="Across demo members" icon="⌘" color="orange" />
            </section>

            <section className="content-grid">
              <article className="dash-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">GET THINGS DONE</span>
                    <h3>Quick actions</h3>
                  </div>
                  <span className="panel-symbol">↗</span>
                </div>
                <button className="action-row" onClick={() => setShowForm(true)}>
                  <span className="action-icon">＋</span>
                  <span><strong>Add a team member</strong><small>Create an employee or recruiter entry</small></span>
                  <span className="action-arrow">→</span>
                </button>
                <button className="action-row" onClick={() => setActiveTab("directory")}>
                  <span className="action-icon">♙</span>
                  <span><strong>View team directory</strong><small>Search your people list</small></span>
                  <span className="action-arrow">→</span>
                </button>
              </article>

              <article className="dash-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">WORKSPACE STATUS</span>
                    <h3>Everything in one place</h3>
                  </div>
                  <span className="status-pill">● Active</span>
                </div>
                <div className="workspace-summary">
                  <div className="summary-mark">K</div>
                  <div><strong>Krew Workspace</strong><small>Organization overview</small></div>
                </div>
                <div className="summary-line"><span>Team directory</span><strong>{members.length} members</strong></div>
                <div className="summary-line"><span>Departments</span><strong>{departments}</strong></div>
                <div className="summary-line"><span>Workspace status</span><strong className="text-green">Operational</strong></div>
              </article>
            </section>

            <section className="dash-panel">
              <div className="panel-heading">
                <div><span className="eyebrow">YOUR PEOPLE</span><h3>Recently added members</h3></div>
                <button className="btn btn-ghost" onClick={() => setActiveTab("directory")}>View directory →</button>
              </div>
              <MemberTable members={members.slice(0, 4)} />
            </section>
          </>
        )}

        {activeTab === "directory" && (
          <section className="dash-panel">
            <div className="panel-heading directory-heading">
              <div><span className="eyebrow">PEOPLE MANAGEMENT</span><h3>Member directory</h3><p>Search and review your workspace members.</p></div>
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add member</button>
            </div>
            <div className="directory-tools">
              <input
                className="dashboard-input search-input"
                placeholder="Search name, email, role, department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="muted-text">{filteredMembers.length} results</span>
            </div>
            <MemberTable members={filteredMembers} />
          </section>
        )}

        {showForm && (
          <div className="modal-backdrop" onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowForm(false);
          }}>
            <section className="member-modal">
              <div className="panel-heading">
                <div><span className="eyebrow">TEAM MANAGEMENT</span><h3>Add a member</h3></div>
                <button className="icon-button" onClick={() => setShowForm(false)}>×</button>
              </div>
              <p className="muted-text">UI preview only. We'll connect this form to your employee API later.</p>
              <form onSubmit={addDemoMember} className="member-form">
                <label>Full name<input className="dashboard-input" name="fullName" value={form.fullName} onChange={updateForm} placeholder="e.g. Aarav Sharma" required /></label>
                <label>Work email<input className="dashboard-input" name="email" type="email" value={form.email} onChange={updateForm} placeholder="name@company.com" required /></label>
                <label>Role<select className="dashboard-input" name="role" value={form.role} onChange={updateForm}><option value="employee">Employee</option><option value="recruiter">Recruiter</option></select></label>
                <label>Department<input className="dashboard-input" name="department" value={form.department} onChange={updateForm} placeholder="e.g. Engineering" /></label>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Add demo member</button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function MemberTable({ members }) {
  if (!members.length) {
    return <div className="empty-state">No members found. Try another search.</div>;
  }

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead><tr><th>Member</th><th>Role</th><th>Department</th><th>Status</th><th>Profile</th></tr></thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id}>
              <td><div className="table-person"><span className="table-avatar">{member.fullName.charAt(0)}</span><span><strong>{member.fullName}</strong><small>{member.email}</small></span></div></td>
              <td><span className={`role-chip ${member.role}`}>{member.role}</span></td>
              <td>{member.department}</td>
              <td><span className={`member-status ${member.status.toLowerCase()}`}>{member.status}</span></td>
              <td><span className="muted-text">Workspace member</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
