import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CircleDollarSign,
  Pencil,
  Plus,
  Printer,
  ShieldCheck,
  Trash2
} from "lucide-react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { isHiringDepartment } from "../utils/departmentAccess";
import { ORGANIZATION_API_BASE_URL } from "../config/api";
import "../styles/OrganizationPages.css";
import "../styles/Payroll.css";
const API = "https://hiremind-organization.onrender.com/api";
const API_URL = ORGANIZATION_API_BASE_URL;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const EMPTY_STRUCTURE = {
  name: "",
  baseSalary: "",
  currency: "USD",
  allowances: [],
  deductions: [],
  active: true
};

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || "The payroll request failed.");
  }
  return data;
}

function formatCurrency(amount, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency
    }).format(Number(amount) || 0);
  } catch {
    return `${currency} ${(Number(amount) || 0).toFixed(2)}`;
  }
}

function formatDate(date) {
  if (!date) return "Not paid";
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function componentTotal(components = []) {
  return components.reduce((total, component) => total + (Number(component.amount) || 0), 0);
}

function ComponentEditor({ label, items, onChange }) {
  function updateItem(index, key, value) {
    onChange(items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [key]: value } : item
    )));
  }

  return (
    <fieldset className="payroll-component-editor">
      <legend>{label}</legend>
      {items.map((item, index) => (
        <div className="payroll-component-row" key={`${label}-${index}`}>
          <label>
            Component
            <input
              value={item.name}
              maxLength={100}
              placeholder={label === "Allowances" ? "e.g. Housing" : "e.g. Tax"}
              onChange={(event) => updateItem(index, "name", event.target.value)}
            />
          </label>
          <label>
            Amount
            <input
              type="number"
              min="0"
              step="0.01"
              value={item.amount}
              placeholder="0.00"
              onChange={(event) => updateItem(index, "amount", event.target.value)}
            />
          </label>
          <button
            className="payroll-icon-btn payroll-remove-btn"
            type="button"
            aria-label={`Remove ${label.toLowerCase()} component`}
            onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      ))}
      <button
        className="org-secondary-btn payroll-add-component"
        type="button"
        onClick={() => onChange([...items, { name: "", amount: "" }])}
      >
        <Plus size={15} aria-hidden="true" /> Add {label.toLowerCase()}
      </button>
    </fieldset>
  );
}

function PayrollAdjustmentEditor({ record, onSave, busy }) {
  const [basicSalary, setBasicSalary] = useState(String(record.basicSalary ?? ""));
  const [earnings, setEarnings] = useState(
    (record.earnings || []).map((item) => ({ ...item, amount: String(item.amount) }))
  );
  const [deductions, setDeductions] = useState(
    (record.deductionItems || []).map((item) => ({ ...item, amount: String(item.amount) }))
  );

  function submit(event) {
    event.preventDefault();
    onSave(record._id, {
      basicSalary: Number(basicSalary),
      earnings: earnings.map((item) => ({ name: item.name, amount: Number(item.amount) })),
      deductionItems: deductions.map((item) => ({ name: item.name, amount: Number(item.amount) }))
    });
  }

  return (
    <form className="payroll-adjustment-form" onSubmit={submit}>
      <label>
        Basic salary
        <input
          type="number"
          min="0"
          step="0.01"
          required
          value={basicSalary}
          onChange={(event) => setBasicSalary(event.target.value)}
        />
      </label>
      <ComponentEditor label="Allowances" items={earnings} onChange={setEarnings} />
      <ComponentEditor label="Deductions" items={deductions} onChange={setDeductions} />
      <button className="org-primary-btn" type="submit" disabled={busy}>
        {busy ? "Saving..." : "Save adjustments"}
      </button>
    </form>
  );
}

export default function Payroll() {
  const [user, setUser] = useState(null);
  const [payroll, setPayroll] = useState([]);
  const [structures, setStructures] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedStructures, setSelectedStructures] = useState({});
  const [structureForm, setStructureForm] = useState(EMPTY_STRUCTURE);
  const [editingStructureId, setEditingStructureId] = useState("");
  const [period, setPeriod] = useState({
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear())
  });
  const [filter, setFilter] = useState({ month: "all", year: "all" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [skippedEmployees, setSkippedEmployees] = useState([]);
  const [printRecord, setPrintRecord] = useState(null);

  const canManage = user?.role === "admin" || isHiringDepartment(user);
  const sidebarRole = user?.role === "executive" ? "recruiter" : user?.role;

  async function loadPayroll() {
    const result = await apiRequest("/payroll");
    setPayroll(Array.isArray(result) ? result : result.payroll || []);
  }

  async function loadManagementData() {
    const [structureData, employeeData] = await Promise.all([
      apiRequest("/payroll/structures"),
      apiRequest("/payroll/employees")
    ]);
    const structureList = structureData.structures || [];
    const employeeList = employeeData.employees || [];
    setStructures(structureList);
    setEmployees(employeeList);
    setSelectedStructures(Object.fromEntries(
      employeeList.map((employee) => [
        employee._id,
        employee.salaryStructure?._id || employee.salaryStructure || ""
      ])
    ));
  }

  async function loadPage() {
    setLoading(true);
    setError("");
    try {
      const profile = await apiRequest("/auth/me");
      setUser(profile.user);
      await loadPayroll();
      if (profile.user?.role === "admin" || isHiringDepartment(profile.user)) {
        await loadManagementData();
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    if (!printRecord) return undefined;
    const finishPrint = () => setPrintRecord(null);
    window.addEventListener("afterprint", finishPrint);
    const timeout = window.setTimeout(() => window.print(), 100);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("afterprint", finishPrint);
    };
  }, [printRecord]);

  const filteredPayroll = useMemo(() => payroll.filter((record) => (
    (filter.month === "all" || record.month === MONTHS[Number(filter.month) - 1])
    && (filter.year === "all" || String(record.year) === filter.year)
  )), [payroll, filter]);

  const payrollYears = useMemo(
    () => [...new Set(payroll.map((record) => String(record.year)))].sort((a, b) => Number(b) - Number(a)),
    [payroll]
  );

  async function saveStructure(event) {
    event.preventDefault();
    setBusy("structure");
    setError("");
    setMessage("");
    const payload = {
      ...structureForm,
      baseSalary: Number(structureForm.baseSalary),
      allowances: structureForm.allowances.map((item) => ({
        name: item.name.trim(),
        amount: Number(item.amount)
      })),
      deductions: structureForm.deductions.map((item) => ({
        name: item.name.trim(),
        amount: Number(item.amount)
      }))
    };
    try {
      await apiRequest(
        editingStructureId
          ? `/payroll/structures/${editingStructureId}`
          : "/payroll/structures",
        {
          method: editingStructureId ? "PATCH" : "POST",
          body: JSON.stringify(payload)
        }
      );
      setStructureForm(EMPTY_STRUCTURE);
      setEditingStructureId("");
      setMessage(editingStructureId ? "Salary structure updated." : "Salary structure created.");
      await loadManagementData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
    }
  }

  function editStructure(structure) {
    setEditingStructureId(structure._id);
    setStructureForm({
      name: structure.name,
      baseSalary: String(structure.baseSalary),
      currency: structure.currency || "USD",
      allowances: (structure.allowances || []).map((item) => ({
        name: item.name,
        amount: String(item.amount)
      })),
      deductions: (structure.deductions || []).map((item) => ({
        name: item.name,
        amount: String(item.amount)
      })),
      active: structure.active
    });
    document.getElementById("payroll-structure-form")?.scrollIntoView({ behavior: "smooth" });
  }

  async function toggleStructure(structure) {
    setBusy(`structure-${structure._id}`);
    setError("");
    setMessage("");
    try {
      await apiRequest(`/payroll/structures/${structure._id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !structure.active })
      });
      setMessage(`Salary structure ${structure.active ? "deactivated" : "activated"}.`);
      await loadManagementData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
    }
  }

  async function assignStructure(employee) {
    const salaryStructureId = selectedStructures[employee._id] || null;
    setBusy(`employee-${employee._id}`);
    setError("");
    setMessage("");
    try {
      await apiRequest(`/payroll/employees/${employee._id}/structure`, {
        method: "PUT",
        body: JSON.stringify({ salaryStructureId })
      });
      setMessage(`Salary structure ${salaryStructureId ? "assigned to" : "removed from"} ${employee.fullName}.`);
      await loadManagementData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
    }
  }

  async function processPayroll(event) {
    event.preventDefault();
    setBusy("process");
    setError("");
    setMessage("");
    setSkippedEmployees([]);
    try {
      const result = await apiRequest("/payroll/process", {
        method: "POST",
        body: JSON.stringify({ month: Number(period.month), year: Number(period.year) })
      });
      setSkippedEmployees(result.skippedEmployees || []);
      setMessage(
        `Payroll processed for ${result.month} ${result.year}. `
        + `${result.processedCount} new record(s); ${result.skippedCount} employee(s) skipped.`
      );
      await loadPayroll();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
    }
  }

  async function markPaid(record) {
    setBusy(`paid-${record._id}`);
    setError("");
    setMessage("");
    try {
      await apiRequest(`/payroll/${record._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Paid" })
      });
      setMessage(`Payment recorded for ${record.employeeName || record.employeeId?.fullName || "employee"}.`);
      await loadPayroll();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
    }
  }

  async function saveAdjustments(id, adjustments) {
    setBusy(`adjust-${id}`);
    setError("");
    setMessage("");
    try {
      await apiRequest(`/payroll/${id}/adjustments`, {
        method: "PATCH",
        body: JSON.stringify(adjustments)
      });
      setMessage("Payroll adjustments saved.");
      await loadPayroll();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
    }
  }

  const currentYear = new Date().getFullYear();
  const availableYears = [...new Set([currentYear - 1, currentYear, currentYear + 1, ...payrollYears.map(Number)])]
    .sort((a, b) => a - b);
  const pendingCount = payroll.filter((record) => record.status !== "Paid").length;
  const paidCount = payroll.filter((record) => record.status === "Paid").length;

  return (
    <div className="dashboard-shell">
      <Sidebar user={user} role={sidebarRole || "employee"} />
      <main className="workday-main org-page payroll-page">
        <header className="org-page-header">
          <div>
            <span className="org-eyebrow">KREW / PEOPLE OPERATIONS</span>
            <h1>{canManage ? <>Payroll <span>management.</span></> : <>My <span>payroll.</span></>}</h1>
            <p>
              {canManage
                ? "Set up compensation, assign salary packages, and run monthly payroll."
                : "View your payslips, salary breakdown, deductions, and payment status."}
            </p>
          </div>
          <span className="org-count-pill">{user?.fullName || "Loading profile..."}</span>
        </header>

        {error && <div className="org-feedback payroll-feedback-error" role="alert">{error}</div>}
        {message && <div className="org-feedback" role="status">{message}</div>}
        {skippedEmployees.length > 0 && (
          <div className="payroll-skipped-panel">
            <strong>Assign a salary structure before processing payroll for:</strong>
            <span>{skippedEmployees.map((employee) => employee.fullName).join(", ")}</span>
          </div>
        )}

        <section className="payroll-intro-card">
          <span className="payroll-intro-icon">
            {canManage
              ? <CircleDollarSign size={24} aria-hidden="true" />
              : <ShieldCheck size={24} aria-hidden="true" />}
          </span>
          <div>
            <span className="org-eyebrow">{canManage ? "PAYROLL ADMINISTRATION" : "EMPLOYEE PAYSLIPS"}</span>
            <h2>{canManage ? "Compensation, managed in one place." : "Your pay information, in one place."}</h2>
            <p>
              {canManage
                ? "Maintain salary structures and employee payroll records. Each processed payslip keeps a snapshot of its salary breakdown."
                : "Your payroll details are private to your account and reflect the records issued by your organization."}
            </p>
          </div>
        </section>

        {canManage && (
          <>
            <section className="payroll-summary-grid" aria-label="Payroll summary">
              <article className="payroll-summary-card">
                <span>Payroll records</span><strong>{payroll.length}</strong>
              </article>
              <article className="payroll-summary-card">
                <span>Awaiting payment</span><strong>{pendingCount}</strong>
              </article>
              <article className="payroll-summary-card">
                <span>Paid records</span><strong>{paidCount}</strong>
              </article>
              <article className="payroll-summary-card">
                <span>Active employees</span><strong>{employees.length}</strong>
              </article>
            </section>

            <section className="payroll-admin-grid">
              <section className="org-card" id="payroll-structure-form">
                <div className="org-card-heading">
                  <span className="org-card-icon"><CircleDollarSign size={20} aria-hidden="true" /></span>
                  <div>
                    <h2>{editingStructureId ? "Edit salary structure" : "Create salary structure"}</h2>
                    <p>Define base pay, recurring earnings, deductions, and currency.</p>
                  </div>
                </div>
                <form className="org-form payroll-structure-form" onSubmit={saveStructure}>
                  <div className="org-fields-grid">
                    <label>
                      Structure name
                      <input
                        required
                        maxLength={100}
                        value={structureForm.name}
                        placeholder="e.g. Full-time monthly"
                        onChange={(event) => setStructureForm({ ...structureForm, name: event.target.value })}
                      />
                    </label>
                    <label>
                      Currency code
                      <input
                        required
                        minLength={3}
                        maxLength={3}
                        pattern="[A-Z]{3}"
                        title="Use a three-letter uppercase currency code, such as USD or INR."
                        value={structureForm.currency}
                        onChange={(event) => setStructureForm({ ...structureForm, currency: event.target.value.toUpperCase() })}
                      />
                    </label>
                    <label className="org-field-full">
                      Base salary
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={structureForm.baseSalary}
                        placeholder="0.00"
                        onChange={(event) => setStructureForm({ ...structureForm, baseSalary: event.target.value })}
                      />
                    </label>
                  </div>
                  <ComponentEditor
                    label="Allowances"
                    items={structureForm.allowances}
                    onChange={(allowances) => setStructureForm({ ...structureForm, allowances })}
                  />
                  <ComponentEditor
                    label="Deductions"
                    items={structureForm.deductions}
                    onChange={(deductions) => setStructureForm({ ...structureForm, deductions })}
                  />
                  <div className="payroll-live-total">
                    <span>Estimated monthly take-home</span>
                    <strong>
                      {formatCurrency(
                        Math.max(
                          0,
                          Number(structureForm.baseSalary || 0)
                          + componentTotal(structureForm.allowances)
                          - componentTotal(structureForm.deductions)
                        ),
                        structureForm.currency || "USD"
                      )}
                    </strong>
                  </div>
                  <div className="org-form-actions payroll-form-actions">
                    {editingStructureId && (
                      <button
                        className="org-secondary-btn"
                        type="button"
                        onClick={() => {
                          setEditingStructureId("");
                          setStructureForm(EMPTY_STRUCTURE);
                        }}
                      >
                        Cancel edit
                      </button>
                    )}
                    <button className="org-primary-btn" type="submit" disabled={busy === "structure"}>
                      {busy === "structure" ? "Saving..." : editingStructureId ? "Save changes" : "Create structure"}
                    </button>
                  </div>
                </form>
              </section>

              <section className="org-card">
                <div className="org-section-heading">
                  <div>
                    <span className="org-eyebrow">COMPENSATION CATALOG</span>
                    <h2>Salary structures</h2>
                  </div>
                  <span className="org-count-pill">{structures.length}</span>
                </div>
                {structures.length === 0 ? (
                  <p className="payroll-empty-note">No structures yet. Create one to start assigning compensation.</p>
                ) : (
                  <div className="payroll-structure-list">
                    {structures.map((structure) => (
                      <article className="payroll-structure-item" key={structure._id}>
                        <div className="payroll-structure-title">
                          <div>
                            <strong>{structure.name}</strong>
                            <span>{formatCurrency(structure.baseSalary, structure.currency)} base · {structure.currency}</span>
                          </div>
                          <span className={`payroll-state ${structure.active ? "is-active" : "is-inactive"}`}>
                            {structure.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="payroll-structure-totals">
                          <span>{structure.allowances?.length || 0} allowance(s)</span>
                          <span>{structure.deductions?.length || 0} deduction(s)</span>
                          <span>
                            Est. net: {formatCurrency(
                              Math.max(
                                0,
                                Number(structure.baseSalary)
                                + componentTotal(structure.allowances)
                                - componentTotal(structure.deductions)
                              ),
                              structure.currency
                            )}
                          </span>
                        </div>
                        <div className="payroll-row-actions">
                          <button className="org-secondary-btn" type="button" onClick={() => editStructure(structure)}>
                            <Pencil size={14} aria-hidden="true" /> Edit
                          </button>
                          <button
                            className="org-secondary-btn"
                            type="button"
                            disabled={busy === `structure-${structure._id}`}
                            onClick={() => toggleStructure(structure)}
                          >
                            {structure.active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </section>

            <section className="org-card payroll-assignment-card">
              <div className="org-section-heading">
                <div>
                  <span className="org-eyebrow">EMPLOYEE PAY RECORDS</span>
                  <h2>Assign salary structures</h2>
                </div>
                <span className="org-count-pill">{employees.length} active members</span>
              </div>
              {employees.length === 0 ? (
                <p className="payroll-empty-note">No active employees, managers, or executives are available for payroll.</p>
              ) : (
                <div className="payroll-table-wrap">
                  <table className="payroll-table">
                    <thead>
                      <tr><th>Employee</th><th>Role</th><th>Department</th><th>Salary structure</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {employees.map((employee) => (
                        <tr key={employee._id}>
                          <td>
                            <strong>{employee.fullName}</strong>
                            <small>{employee.employeeId || employee.email}</small>
                          </td>
                          <td className="payroll-role-cell">{employee.role}</td>
                          <td>{employee.department?.name || "—"}</td>
                          <td>
                            <select
                              aria-label={`Salary structure for ${employee.fullName}`}
                              value={selectedStructures[employee._id] || ""}
                              onChange={(event) => setSelectedStructures({
                                ...selectedStructures,
                                [employee._id]: event.target.value
                              })}
                            >
                              <option value="">Unassigned</option>
                              {structures.filter((structure) => (
                                structure.active || String(structure._id) === String(selectedStructures[employee._id])
                              )).map((structure) => (
                                <option value={structure._id} key={structure._id}>
                                  {structure.name} · {formatCurrency(structure.baseSalary, structure.currency)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <button
                              className="org-secondary-btn"
                              type="button"
                              disabled={
                                busy === `employee-${employee._id}`
                                || String(selectedStructures[employee._id] || "") === String(employee.salaryStructure?._id || employee.salaryStructure || "")
                              }
                              onClick={() => assignStructure(employee)}
                            >
                              {busy === `employee-${employee._id}` ? "Saving..." : "Save"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="org-card payroll-process-card">
              <div className="org-section-heading">
                <div>
                  <span className="org-eyebrow">PAYROLL RUN</span>
                  <h2>Process a pay period</h2>
                </div>
              </div>
              <form className="payroll-process-form" onSubmit={processPayroll}>
                <label>
                  Pay month
                  <select value={period.month} onChange={(event) => setPeriod({ ...period, month: event.target.value })}>
                    {MONTHS.map((month, index) => (
                      <option value={index + 1} key={month}>{month}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Pay year
                  <select value={period.year} onChange={(event) => setPeriod({ ...period, year: event.target.value })}>
                    {availableYears.map((year) => <option value={year} key={year}>{year}</option>)}
                  </select>
                </label>
                <p>Each employee is processed once per month. Existing payslips are preserved if you run the same period again.</p>
                <button className="org-primary-btn" type="submit" disabled={busy === "process" || employees.length === 0}>
                  {busy === "process" ? "Processing..." : "Process payroll"}
                </button>
              </form>
            </section>
          </>
        )}

        <section className="org-card payroll-records-card">
          <div className="org-section-heading payroll-records-heading">
            <div>
              <span className="org-eyebrow">{canManage ? "ORGANIZATION PAYROLL" : "PAYMENT HISTORY"}</span>
              <h2>{canManage ? "Payroll records" : "Your payslips"}</h2>
            </div>
            {canManage && (
              <div className="payroll-filters">
                <label>
                  Month
                  <select value={filter.month} onChange={(event) => setFilter({ ...filter, month: event.target.value })}>
                    <option value="all">All months</option>
                    {MONTHS.map((month, index) => <option value={index + 1} key={month}>{month}</option>)}
                  </select>
                </label>
                <label>
                  Year
                  <select value={filter.year} onChange={(event) => setFilter({ ...filter, year: event.target.value })}>
                    <option value="all">All years</option>
                    {payrollYears.map((year) => <option value={year} key={year}>{year}</option>)}
                  </select>
                </label>
              </div>
            )}
          </div>
          {loading ? (
            <p className="payroll-empty-note" role="status">Loading payroll records...</p>
          ) : filteredPayroll.length === 0 ? (
            <p className="payroll-empty-note">
              {canManage
                ? "No payroll records match the selected filters. Assign salary structures and process a pay period to get started."
                : "Payslips will appear here after payroll has been processed for your account."}
            </p>
          ) : (
            <div className="payroll-table-wrap">
              <table className="payroll-table">
                <thead>
                  <tr>
                    {canManage && <th>Employee</th>}
                    <th>Period</th><th>Salary breakdown</th><th>Deductions</th><th>Net pay</th><th>Payment</th><th>Status</th>
                    <th>{canManage ? "Actions" : "Payslip"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayroll.map((record) => (
                    <tr key={record._id}>
                      {canManage && (
                        <td>
                          <strong>{record.employeeName || record.employeeId?.fullName || "Employee"}</strong>
                          <small>{record.employeeId?.employeeId || record.salaryStructureName || "—"}</small>
                        </td>
                      )}
                      <td>{record.month} {record.year}</td>
                      <td className="payroll-breakdown-cell">
                        <strong>Basic: {formatCurrency(record.basicSalary, record.currency)}</strong>
                        {(record.earnings || []).map((item, index) => (
                          <small key={`${item.name}-${index}`}>{item.name}: {formatCurrency(item.amount, record.currency)}</small>
                        ))}
                        {Number(record.allowances) > 0 && (
                          <small>Total allowances: {formatCurrency(record.allowances, record.currency)}</small>
                        )}
                      </td>
                      <td className="payroll-breakdown-cell">
                        <strong>{formatCurrency(record.deductions, record.currency)}</strong>
                        {(record.deductionItems || []).map((item, index) => (
                          <small key={`${item.name}-${index}`}>{item.name}: {formatCurrency(item.amount, record.currency)}</small>
                        ))}
                      </td>
                      <td><strong>{formatCurrency(record.netSalary, record.currency)}</strong></td>
                      <td>{formatDate(record.paymentDate)}</td>
                      <td><span className={`payroll-state ${record.status === "Paid" ? "is-active" : "is-pending"}`}>{record.status || "Pending"}</span></td>
                      {canManage && (
                        <td className="payroll-actions-cell">
                          <button
                            className="org-secondary-btn payroll-print-btn"
                            type="button"
                            aria-label={`Print ${record.month} ${record.year} payslip`}
                            onClick={() => setPrintRecord(record)}
                          >
                            <Printer size={14} aria-hidden="true" /> Payslip
                          </button>
                          {record.status !== "Paid" && (
                            <>
                              <details className="payroll-adjustment-details">
                                <summary><Pencil size={14} aria-hidden="true" /> Adjust</summary>
                                <PayrollAdjustmentEditor
                                  record={record}
                                  busy={busy === `adjust-${record._id}`}
                                  onSave={saveAdjustments}
                                />
                              </details>
                              {record.status === "Processed" && (
                                <button
                                  className="payroll-pay-btn"
                                  type="button"
                                  disabled={busy === `paid-${record._id}`}
                                  onClick={() => markPaid(record)}
                                >
                                  {busy === `paid-${record._id}` ? "Saving..." : "Mark paid"}
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      )}
                      {!canManage && (
                        <td>
                          <button
                            className="org-secondary-btn payroll-print-btn"
                            type="button"
                            onClick={() => setPrintRecord(record)}
                          >
                            <Printer size={14} aria-hidden="true" /> Payslip
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="org-card payroll-quick-links">
          <div className="org-section-heading">
            <div><span className="org-eyebrow">QUICK LINKS</span><h2>Back to your workspace</h2></div>
          </div>
          <div className="org-form-actions">
            <Link className="org-secondary-btn" to={`/${sidebarRole || "employee"}/dashboard`}>
              Dashboard <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
            <Link className="org-secondary-btn" to={`/${sidebarRole || "employee"}/attendance`}>
              Attendance <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </section>

        {printRecord && (
          <div className="payroll-print-view">
            <header>
              <span>PAYSLIP</span>
              <h1>{printRecord.month} {printRecord.year}</h1>
              <p>{printRecord.employeeName || user?.fullName} · {printRecord.salaryStructureName || "Salary statement"}</p>
            </header>
            <dl>
              <div><dt>Basic salary</dt><dd>{formatCurrency(printRecord.basicSalary, printRecord.currency)}</dd></div>
              {(printRecord.earnings || []).map((item, index) => (
                <div key={`print-earning-${index}`}><dt>{item.name}</dt><dd>{formatCurrency(item.amount, printRecord.currency)}</dd></div>
              ))}
              <div><dt>Total earnings</dt><dd>{formatCurrency(Number(printRecord.basicSalary) + Number(printRecord.allowances), printRecord.currency)}</dd></div>
              {(printRecord.deductionItems || []).map((item, index) => (
                <div key={`print-deduction-${index}`}><dt>{item.name}</dt><dd>− {formatCurrency(item.amount, printRecord.currency)}</dd></div>
              ))}
              <div><dt>Total deductions</dt><dd>{formatCurrency(printRecord.deductions, printRecord.currency)}</dd></div>
              <div className="payroll-print-net"><dt>Net pay</dt><dd>{formatCurrency(printRecord.netSalary, printRecord.currency)}</dd></div>
              <div><dt>Payment status</dt><dd>{printRecord.status || "Pending"}</dd></div>
              <div><dt>Payment date</dt><dd>{formatDate(printRecord.paymentDate)}</dd></div>
            </dl>
          </div>
        )}
      </main>
    </div>
  );
}
