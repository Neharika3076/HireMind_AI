
import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../styles/OrganizationPages.css";

const API = "http://localhost:5000/api";

const emptyMember = {
  fullName: "",
  email: "",
  password: "",
  department: "",
  role: "employee",
  designation: "",
  position: "",
  manager: "",
};

export default function AddMember() {
  const [user, setUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [members, setMembers] = useState([]);

  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    description: "",
  });

  const [memberForm, setMemberForm] = useState(emptyMember);
  const [loading, setLoading] = useState(true);
  const [departmentLoading, setDepartmentLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [departmentError, setDepartmentError] = useState("");

  // Common API request helper
  async function request(url, options = {}) {
    const response = await fetch(`${API}${url}`, {
      credentials: "include",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Request failed.");
    }

    return data;
  }

  // Normalize department API responses
  function getDepartmentList(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.departments)) return data.departments;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }

  // Fetch departments and automatically select a valid department
  async function refreshDepartments(preferredDepartment = "") {
    setDepartmentLoading(true);
    setDepartmentError("");

    try {
      const data = await request("/departments");
      const departmentList = getDepartmentList(data);

      setDepartments(departmentList);

      setMemberForm((current) => {
        const preferredExists = departmentList.some(
          (department) => String(department._id) === String(preferredDepartment)
        );

        const currentExists = departmentList.some(
          (department) => String(department._id) === String(current.department)
        );

        return {
          ...current,
          department: preferredExists
            ? preferredDepartment
            : currentExists
              ? current.department
              : departmentList[0]?._id || "",
        };
      });

      return departmentList;
    } catch (err) {
      setDepartmentError(err.message);
      throw err;
    } finally {
      setDepartmentLoading(false);
    }
  }

  // Load profile, departments and team members
  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [profile, departmentData, memberData] = await Promise.all([
        request("/auth/me"),
        request("/departments"),
        request("/users"),
      ]);

      const departmentList = getDepartmentList(departmentData);

      setUser(profile.user);
      setDepartments(departmentList);
      setMembers(memberData.users || []);
      console.log(
        "Users loaded for Reports to:",
        (memberData.users || []).map((member) => ({
          id: member._id,
          name: member.fullName,
          role: member.role,
          organization: member.organization,
        }))
      );

      setMemberForm((current) => {
        const currentExists = departmentList.some(
          (department) => String(department._id) === String(current.department)
        );

        return {
          ...current,
          department: currentExists
            ? current.department
            : departmentList[0]?._id || "",
        };
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Create department, refresh dropdown and select the new department
  async function createDepartment(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    setDepartmentError("");

    try {
      const departmentName = departmentForm.name.trim();

      if (!departmentName) {
        throw new Error("Please enter a department name.");
      }

      const data = await request("/departments", {
        method: "POST",
        body: JSON.stringify({
          name: departmentName,
          description: departmentForm.description.trim(),
        }),
      });

      // Fetch the latest departments from this organization
      const departmentData = await request("/departments");
      const departmentList = getDepartmentList(departmentData);

      setDepartments(departmentList);

      // Use the newly created department ID if returned by the API
      const newDepartment =
        data.department ||
        departmentList.find(
          (department) =>
            department.name?.trim().toLowerCase() ===
            departmentName.toLowerCase()
        );

      const newDepartmentId = newDepartment?._id
        ? String(newDepartment._id)
        : "";

      setMemberForm((current) => {
        const currentExists = departmentList.some(
          (department) => String(department._id) === String(current.department)
        );

        return {
          ...current,
          department: newDepartmentId
            ? newDepartmentId
            : currentExists
              ? current.department
              : departmentList[0]?._id || "",
        };
      });

      setDepartmentForm({
        name: "",
        description: "",
      });

      setMessage(
        newDepartmentId
          ? "Department created successfully and selected for the new member."
          : "Department created successfully. The dropdown has been refreshed."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Create a team member
  async function addMember(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (!memberForm.department) {
        throw new Error("Please create or select a department first.");
      }

      await request("/users", {
        method: "POST",
        body: JSON.stringify(memberForm),
      });

      setMessage("Member created successfully.");

      const assignedDepartment = memberForm.department;

      setMemberForm({
        ...emptyMember,
        department: assignedDepartment,
      });

      // Refresh team members and department member counts
      const memberData = await request("/users");
      setMembers(memberData.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }



  // Members follow the Admin → Executive → Manager → Employee reporting chain.


  const selectedDepartment = departments.find(
    (department) =>
      String(department._id) === String(memberForm.department)
  );

  const isHiringDepartmentMember =
    selectedDepartment?.name?.trim().toLowerCase() === "hr & hiring";


const managers = members.filter((member) => {
  const memberRole = String(member.role || "").trim().toLowerCase();
  const selectedRole = String(memberForm.role || "").trim().toLowerCase();

  const memberDepartmentId = String(
    member.department?._id || member.department || ""
  );
  const selectedDepartmentId = String(memberForm.department || "");

  // HR and Executives report to Admin.
  if (selectedRole === "hr" || selectedRole === "executive") {
    return memberRole === "admin";
  }

  // Managers report to Executives in the same department.
  if (selectedRole === "manager") {
    return (
      memberRole === "executive" &&
      memberDepartmentId === selectedDepartmentId
    );
  }

  // Employees report to Managers in the same department.
  if (selectedRole === "employee") {
    return (
      memberRole === "manager" &&
      memberDepartmentId === selectedDepartmentId
    );
  }

  return false;
});


  return (
    <div className="dashboard-shell">
      <Sidebar user={user} role={user?.role || "admin"} />

      <main className="workday-main org-page">
        <header className="org-page-header">
          <div>
            <span className="org-eyebrow">KREW / WORKSPACE</span>
            <h1>
              Organization <span>Management.</span>
            </h1>
            <p>Set up departments and add members in the Admin → Executive → Manager → Employee hierarchy.</p>
          </div>

          <div className="org-header-count">
            <strong>{members.length}</strong>
            <span>Team members</span>
          </div>
        </header>

        {error && (
          <div className="org-feedback" role="alert">
            {error}
            <button type="button" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}

        {message && (
          <div className="org-feedback" role="status">
            ✓ {message}
            <button type="button" onClick={() => setMessage("")}>
              ×
            </button>
          </div>
        )}

        {loading ? (
          <p>Loading organization data...</p>
        ) : (
          <>
            <div className="org-form-grid">
              {/* Create Department */}
              <section className="org-card">
                <div className="org-card-heading">
                  <div className="org-card-icon">▦</div>
                  <div>
                    <h2>Create department</h2>
                    <p>Set up a department in your organization.</p>
                  </div>
                </div>

                <form className="org-form" onSubmit={createDepartment}>
                  <label>
                    Department name
                    <input
                      required
                      value={departmentForm.name}
                      onChange={(e) =>
                        setDepartmentForm((current) => ({
                          ...current,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Engineering"
                    />
                  </label>

                  <label>
                    Description
                    <textarea
                      rows="3"
                      value={departmentForm.description}
                      onChange={(e) =>
                        setDepartmentForm((current) => ({
                          ...current,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Department responsibilities"
                    />
                  </label>

                  <button className="org-primary-btn" disabled={busy}>
                    {busy ? "Saving..." : "Create department"}
                  </button>
                </form>
              </section>

              {/* Add Team Member */}
              <section className="org-card">
                <div className="org-card-heading">
                  <div className="org-card-icon">♙</div>
                  <div>
                    <h2>Add a team member</h2>
                    <p>Create an account and assign a department.</p>
                  </div>
                </div>

                <form className="org-form" onSubmit={addMember}>
                  <div className="org-fields-grid">
                    <label>
                      Full name
                      <input
                        required
                        value={memberForm.fullName}
                        onChange={(e) =>
                          setMemberForm((current) => ({
                            ...current,
                            fullName: e.target.value,
                          }))
                        }
                      />
                    </label>

                    <label>
                      Work email
                      <input
                        type="email"
                        required
                        value={memberForm.email}
                        onChange={(e) =>
                          setMemberForm((current) => ({
                            ...current,
                            email: e.target.value,
                          }))
                        }
                      />
                    </label>

                    <label>
                      Password
                      <input
                        type="password"
                        minLength={8}
                        required
                        autoComplete="new-password"
                        value={memberForm.password}
                        onChange={(e) =>
                          setMemberForm((current) => ({
                            ...current,
                            password: e.target.value,
                          }))
                        }
                      />
                    </label>

                    <label>
                      Department
                      <select
                        name="department"
                        value={memberForm.department}
                        onChange={(e) =>
                          setMemberForm((current) => ({
                            ...current,
                            department: e.target.value,
                            manager: "",
                          }))
                        }
                        required
                        disabled={
                          departmentLoading || departments.length === 0
                        }
                      >
                        <option value="">
                          {departmentLoading
                            ? "Loading departments..."
                            : "Select department"}
                        </option>

                        {departments.map((department) => (
                          <option
                            key={department._id}
                            value={String(department._id)}
                          >
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {departmentError && (
                      <p className="error-message">{departmentError}</p>
                    )}

                    <label>
                      Account role
                      <select
                        value={memberForm.role}
                        onChange={(e) => {
                          const role = e.target.value;
                          setMemberForm((current) => ({
                            ...current,
                            role,
                            manager: "",
                          }));
                        }}
                      >

                        <option value="hr">HR</option>
                        <option value="executive">Executive</option>
                        <option value="manager">Manager</option>
                        <option value="employee">Employee</option>
                      </select>
                    </label>

                    <label>
                      Designation
                      <input
                        value={memberForm.designation}
                        onChange={(e) =>
                          setMemberForm((current) => ({
                            ...current,
                            designation: e.target.value,
                          }))
                        }
                        placeholder="Software Engineer"
                      />
                    </label>

                    <label className="org-field-full">
                      Position / title
                      <input
                        value={memberForm.position}
                        onChange={(e) =>
                          setMemberForm((current) => ({
                            ...current,
                            position: e.target.value,
                          }))
                        }
                        placeholder="Team Lead"
                      />
                    </label>

                    {memberForm.role !== "admin" && (
                      <label className="org-field-full">
                        Reports to
                        <select
                          required
                          value={memberForm.manager}
                          onChange={(e) =>
                            setMemberForm((current) => ({
                              ...current,
                              manager: e.target.value,
                            }))
                          }
                        >
                          <option value="">

                            {isHiringDepartmentMember || memberForm.role === "hr" ||
                              memberForm.role === "executive"
                              ? "Select an admin"
                              : memberForm.role === "manager"
                                ? "Select an executive"
                                : "Select a manager"}

                          </option>

                          {managers.map((manager) => (
                            <option key={manager._id} value={manager._id}>
                              {manager.fullName} ({manager.role})
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>

                  <button
                    className="org-primary-btn"
                    disabled={busy || !departments.length}
                  >
                    {busy ? "Saving..." : "Create member"}
                  </button>

                  {!departments.length && (
                    <small>
                      {departmentLoading
                        ? "Loading departments..."
                        : "Create a department before adding members."}
                    </small>
                  )}
                </form>
              </section>
            </div>

            {/* Organization Departments */}
            <section className="org-card org-directory-card">
              <div className="org-section-heading">
                <div>
                  <span className="org-eyebrow">YOUR ORGANIZATION</span>
                  <h2>Departments</h2>
                </div>

                <span className="org-count-pill">
                  {departments.length} departments
                </span>
              </div>

              {departments.length === 0 ? (
                <p>No departments found. Create your first department above.</p>
              ) : (
                <div className="org-department-grid">
                  {departments.map((department) => {
                    const people = members.filter(
                      (member) =>
                        String(
                          member.department?._id ||
                          member.department ||
                          ""
                        ) === String(department._id)
                    );

                    return (
                      <article
                        className="org-department-card"
                        key={department._id}
                      >
                        <div className="org-department-top">
                          <span className="org-card-icon">▦</span>
                          <span className="org-count-pill">
                            {people.length} members
                          </span>
                        </div>

                        <h3>{department.name}</h3>
                        <p>{department.description || "No description."}</p>

                        <div className="org-member-avatars">
                          {people.slice(0, 4).map((person) => (
                            <span key={person._id} title={person.fullName}>
                              {person.fullName?.charAt(0).toUpperCase()}
                            </span>
                          ))}

                          {!people.length && <small>No members yet</small>}
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
