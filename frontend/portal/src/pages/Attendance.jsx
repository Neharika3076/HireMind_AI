import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, LogIn, LogOut, Send, Users, X } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { isHiringDepartment } from "../utils/departmentAccess";
import { ORGANIZATION_API_BASE_URL } from "../config/api";
import "../styles/OrganizationPages.css";

const API = "https://hiremind-organization.onrender.com/api";

function formatTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds) {
  if (seconds == null || !Number.isFinite(Number(seconds))) return "—";
  const total = Math.max(0, Math.floor(Number(seconds)));
  const hours = String(Math.floor(total / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const remainder = String(total % 60).padStart(2, "0");
  return `${hours}:${minutes}:${remainder}`;
}

function formatDate(dateKey) {
  if (!dateKey) return "—";
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function recordStatus(record) {
  if (!record?.checkInAt) return "Not checked in";
  if (!record.checkOutAt) return "In progress";
  const duration = record.durationSeconds ?? Math.floor(
    (new Date(record.checkOutAt).getTime() - new Date(record.checkInAt).getTime()) / 1000
  );
  if (record.status === "half_day" || Number(duration) < 5 * 60 * 60) return "Half day";
  return "Present";
}

function statusBadgeClass(status) {
  if (status === "Half day") return "half-day";
  if (status === "Not checked in") return "not-checked-in";
  return "present";
}

function roleLabel(role) {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized === "admin") return "Admin";
  if (normalized === "recruiter" || normalized === "executive") return "Executive";
  if (normalized === "manager") return "Manager";
  if (normalized === "hr") return "HR";
  if (normalized === "employee") return "Employee";
  return "—";
}

function referenceId(value) {
  if (!value) return "";
  if (typeof value === "object") return String(value._id || value.id || value);
  return String(value);
}

export default function Attendance() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [dateKey, setDateKey] = useState("");
  const [timeZone, setTimeZone] = useState("");
  const [ownRecord, setOwnRecord] = useState(null);
  const [records, setRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [calendarData, setCalendarData] = useState(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState("");
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leavePage, setLeavePage] = useState(1);
  const [leaveTotal, setLeaveTotal] = useState(0);
  const [leaveHasMore, setLeaveHasMore] = useState(false);
  const [myLeaveRequests, setMyLeaveRequests] = useState([]);
  const [myLeavePage, setMyLeavePage] = useState(1);
  const [myLeaveTotal, setMyLeaveTotal] = useState(0);
  const [myLeaveHasMore, setMyLeaveHasMore] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveSaving, setLeaveSaving] = useState(false);
  const [leaveError, setLeaveError] = useState("");
  const [leaveMessage, setLeaveMessage] = useState("");
  const [leaveForm, setLeaveForm] = useState({ startDateKey: "", endDateKey: "", reason: "" });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [now, setNow] = useState(() => Date.now());

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const isExecutive = user?.role === "executive";
  const isHiringDepartmentMember = user?.role === "employee" && isHiringDepartment(user);
  const showLeaveApprovalColumns = isAdmin || isHiringDepartmentMember || isManager || isExecutive;
  const canReviewLeaves = showLeaveApprovalColumns;
  const routeRole = location.pathname.split("/")[1];

  const todayDateKey = useMemo(() => {
    if (dateKey) return dateKey;
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, [dateKey]);

  const isCheckedInToday = Boolean(ownRecord?.checkInAt);

  const tomorrowDateKey = useMemo(() => {
    const [y, m, d] = todayDateKey.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    return next.toISOString().slice(0, 10);
  }, [todayDateKey]);

  const minLeaveStartDate = isCheckedInToday ? tomorrowDateKey : todayDateKey;

  const loadAttendance = useCallback(async () => {
    const response = await fetch(`${API}/attendance/today`, {
      credentials: "include",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to load attendance records.");
    }
    setDateKey(data.dateKey || "");
    setTimeZone(data.timeZone || "");
    setOwnRecord(data.ownRecord || null);
    setRecords(data.items || []);
    setSummary(data.summary || null);
  }, []);

  const loadHistory = useCallback(async (page = 1, append = false) => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const response = await fetch(`${API}/attendance/history?page=${page}&limit=30`, {
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to load attendance history.");
      }
      setHistory((current) => append ? [...current, ...(data.items || [])] : (data.items || []));
      setHistoryTotal(Number(data.total) || 0);
      setHistoryHasMore(Boolean(data.hasMore));
    } catch (loadError) {
      setHistoryError(loadError.message || "Unable to load attendance history.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadCalendar = useCallback(async (year, month) => {
    setCalendarLoading(true);
    setCalendarError("");
    try {
      const response = await fetch(`${API}/attendance/calendar?year=${year}&month=${month}`, {
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to load the attendance calendar.");
      setCalendarData(data);
    } catch (loadError) {
      setCalendarError(loadError.message || "Unable to load the attendance calendar.");
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  const loadLeaveRequests = useCallback(async (page = 1, append = false) => {
    setLeaveLoading(true);
    setLeaveError("");
    try {
      const view = canReviewLeaves ? "approvals" : "mine";
      const response = await fetch(`${API}/leaves?view=${view}&page=${page}&limit=40`, { credentials: "include" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to load leave requests.");
      const nextRequests = data.requests || [];
      setLeaveRequests((current) => append ? [...current, ...nextRequests] : nextRequests);
      setLeavePage(Number(data.page) || page);
      setLeaveTotal(Number(data.total) || 0);
      setLeaveHasMore(Boolean(data.hasMore));
    } catch (loadError) {
      setLeaveError(loadError.message || "Unable to load leave requests.");
    } finally {
      setLeaveLoading(false);
    }
  }, [canReviewLeaves]);

  const loadMyLeaveRequests = useCallback(async (page = 1, append = false) => {
    if (!canReviewLeaves) return;
    setLeaveLoading(true);
    setLeaveError("");
    try {
      const response = await fetch(`${API}/leaves?view=mine&page=${page}&limit=40`, { credentials: "include" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to load your leave history.");
      const nextRequests = data.requests || [];
      setMyLeaveRequests((current) => append ? [...current, ...nextRequests] : nextRequests);
      setMyLeavePage(Number(data.page) || page);
      setMyLeaveTotal(Number(data.total) || 0);
      setMyLeaveHasMore(Boolean(data.hasMore));
    } catch (loadError) {
      setLeaveError(loadError.message || "Unable to load your leave history.");
    } finally {
      setLeaveLoading(false);
    }
  }, [canReviewLeaves]);

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const response = await fetch(`${API}/auth/me`, {
          credentials: "include",
        });
        const profile = await response.json().catch(() => ({}));
        if (!response.ok || !profile.user) {
          throw new Error(profile.message || "Unable to load your profile. Please sign in again.");
        }
        if (!active) return;
        setUser(profile.user);
        const attendanceResponse = await fetch(`${API}/attendance/today`, {
          credentials: "include",
        });
        const data = await attendanceResponse.json().catch(() => ({}));
        if (!attendanceResponse.ok) {
          throw new Error(data.message || "Unable to load attendance records.");
        }
        if (!active) return;
        setDateKey(data.dateKey || "");
        setTimeZone(data.timeZone || "");
        setOwnRecord(data.ownRecord || null);
        setRecords(data.items || []);
        setSummary(data.summary || null);
        if (data.dateKey) {
          const [year, month] = data.dateKey.split("-").map(Number);
          setCalendarMonth(new Date(year, month - 1, 1));
        }
        await loadHistory();
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    initialize();
    return () => {
      active = false;
    };
  }, [loadHistory]);

  useEffect(() => {
    if (!user) return;
    loadCalendar(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1);
    loadLeaveRequests();
    if (canReviewLeaves) loadMyLeaveRequests();
  }, [calendarMonth, canReviewLeaves, loadCalendar, loadLeaveRequests, loadMyLeaveRequests, user]);

  useEffect(() => {
    if (!ownRecord?.checkInAt || ownRecord.checkOutAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [ownRecord]);

  const elapsedSeconds = useMemo(() => {
    if (!ownRecord?.checkInAt) return null;
    if (ownRecord.checkOutAt) return ownRecord.durationSeconds ?? 0;
    return Math.max(0, Math.floor((now - new Date(ownRecord.checkInAt).getTime()) / 1000));
  }, [now, ownRecord]);

  async function updateAttendance(action) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${API}/attendance/${action}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to update attendance.");
      setMessage(data.message || "Attendance updated.");
      await Promise.all([
        loadAttendance(),
        loadHistory(),
        loadCalendar(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1),
      ]);
    } catch (actionError) {
      setError(actionError.message);
      await loadAttendance().catch((refreshError) => setError(refreshError.message));
    } finally {
      setSaving(false);
    }
  }

  const visibleRecords = useMemo(() => records.filter((record) => {
    const member = record.user || {};
    const status = recordStatus(record);
    const haystack = `${member.fullName || ""} ${member.email || ""} ${member.department?.name || ""}`.toLowerCase();
    return (!search || haystack.includes(search.toLowerCase().trim())) &&
      (filter === "All" || filter === status);
  }), [filter, records, search]);

  const isCheckedIn = Boolean(ownRecord?.checkInAt && !ownRecord?.checkOutAt);
  const isCheckedOut = Boolean(ownRecord?.checkOutAt);
  const statusLabel = isCheckedIn ? "Currently checked in" : isCheckedOut ? "Checked out for today" : "Not checked in";
  const nextHistoryPage = Math.floor(history.length / 30) + 1;
  const calendarDays = calendarData?.days || [];
  const calendarDayByKey = useMemo(
    () => new Map(calendarDays.map((day) => {
      if (day.status === "in_progress" && day.record?.checkInAt) {
        const elapsed = Math.max(0, Math.floor((now - new Date(day.record.checkInAt).getTime()) / 1000));
        if (elapsed >= 5 * 60 * 60) return [day.dateKey, { ...day, status: "present" }];
      }
      return [day.dateKey, day];
    })),
    [calendarDays, now]
  );
  const calendarSummary = useMemo(() => {
    if (!calendarData) return null;
    const days = [...calendarDayByKey.values()];
    const leave = days.filter((day) => day.status === "leave").length;
    return {
      present: days.filter((day) => day.status === "present").length,
      halfDays: days.filter((day) => day.status === "half_day").length,
      leave,
      leaveRemaining: Math.max(0, 3 - leave),
    };
  }, [calendarData, calendarDayByKey]);
  const monthYearLabel = calendarMonth.toLocaleDateString([], { month: "long", year: "numeric" });
  const monthNames = Array.from({ length: 12 }, (_, index) =>
    new Date(2000, index, 1).toLocaleDateString([], { month: "long" })
  );
  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const leadingDays = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const calendarCells = [
    ...Array.from({ length: leadingDays }, (_, index) => ({ key: `empty-${index}`, empty: true })),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const dateKey = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return { key: dateKey, day, date: calendarDayByKey.get(dateKey) };
    }),
  ];
  while (calendarCells.length % 7 !== 0) {
    calendarCells.push({ key: `empty-end-${calendarCells.length}`, empty: true });
  }
  function shiftCalendarMonth(delta) {
    setCalendarMonth((current) => {
      const shifted = new Date(current.getFullYear(), current.getMonth() + delta, 1);
      if (shifted.getFullYear() < 2000) return new Date(2000, 0, 1);
      if (shifted.getFullYear() > 2100) return new Date(2100, 11, 1);
      return shifted;
    });
  }

  async function submitLeave(event) {
    event.preventDefault();
    setLeaveSaving(true);
    setLeaveError("");
    setLeaveMessage("");

    if (!leaveForm.startDateKey || !leaveForm.endDateKey) {
      setLeaveError("Please select both start and end dates.");
      setLeaveSaving(false);
      return;
    }

    if (leaveForm.startDateKey < todayDateKey) {
      setLeaveError("Leave cannot be requested for past dates. Please select today or a future date.");
      setLeaveSaving(false);
      return;
    }

    if (leaveForm.startDateKey <= todayDateKey && leaveForm.endDateKey >= todayDateKey && isCheckedInToday) {
      setLeaveError("You cannot apply for leave for today because you are already checked in.");
      setLeaveSaving(false);
      return;
    }
    try {
      const response = await fetch(`${API}/leaves`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leaveForm),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to submit the leave request.");
      setLeaveMessage(data.message || "Leave request submitted.");
      setLeaveForm({ startDateKey: "", endDateKey: "", reason: "" });
      await Promise.all([
        loadLeaveRequests(),
        canReviewLeaves ? loadMyLeaveRequests() : Promise.resolve(),
        loadCalendar(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1),
      ]);
    } catch (submitError) {
      setLeaveError(submitError.message || "Unable to submit the leave request.");
    } finally {
      setLeaveSaving(false);
    }
  }

  async function decideLeave(requestId, decision) {
    setLeaveSaving(true);
    setLeaveError("");
    setLeaveMessage("");
    try {
      const response = await fetch(`${API}/leaves/${requestId}/decision`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to review the leave request.");
      setLeaveMessage(data.message || "Leave request reviewed.");
      await Promise.all([
        loadLeaveRequests(),
        canReviewLeaves ? loadMyLeaveRequests() : Promise.resolve(),
        loadCalendar(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1),
      ]);
    } catch (decisionError) {
      setLeaveError(decisionError.message || "Unable to review the leave request.");
    } finally {
      setLeaveSaving(false);
    }
  }

  return (
    <div className="dashboard-shell">
      <Sidebar user={user} role={user?.role || routeRole || "employee"} />

      <main className="workday-main org-page attendance-page">
        {error && <div className="org-feedback attendance-feedback error" role="alert">{error}</div>}
        {message && <div className="org-feedback attendance-feedback" role="status">{message}</div>}

        <header className="org-page-header">
          <div>
            <span className="org-eyebrow">KREW / PEOPLE OPERATIONS</span>
            <h1>Attendance <span>Overview.</span></h1>
            <p>{isAdmin ? "Track today's attendance across your organization." : "Review and record your personal workday attendance."}</p>
          </div>
          <span className={`org-status ${isCheckedIn ? "is-online" : ""}`}>
            <i /> {statusLabel}
          </span>
        </header>

        <section className="org-banner attendance-banner attendance-checkin-banner">
          <div className="attendance-banner-copy">
            <span className="org-eyebrow">YOUR WORKDAY · {dateKey || "Today"}</span>
            <h2>{isCheckedIn ? "You're on the clock." : isCheckedOut ? "Your workday is recorded." : "Ready to get started?"}</h2>
            <p>{isCheckedIn ? "Your check-in is saved. Check out when your workday ends." : isCheckedOut ? `Checked in at ${formatTime(ownRecord.checkInAt)} and checked out at ${formatTime(ownRecord.checkOutAt)}.` : "Check in once when you start. Your attendance is recorded securely."}</p>
            {timeZone && <small>Attendance day uses {timeZone}.</small>}
          </div>

          <div className="attendance-session-display">
            <span>{isCheckedOut ? "WORKED TODAY" : "TIME ON CLOCK"}</span>
            <strong>{formatDuration(elapsedSeconds)}</strong>
            {ownRecord?.checkInAt && <small>In {formatTime(ownRecord.checkInAt)}{ownRecord.checkOutAt ? ` · Out ${formatTime(ownRecord.checkOutAt)}` : ""}</small>}
          </div>

          {!ownRecord ? (
            <button className="org-primary-btn attendance-action-btn" disabled={loading || saving} onClick={() => updateAttendance("check-in")}>
              <LogIn size={16} aria-hidden="true" /> {saving ? "Recording…" : "Check in"}
            </button>
          ) : isCheckedIn ? (
            <button className="org-primary-btn attendance-action-btn" disabled={saving} onClick={() => updateAttendance("check-out")}>
              <LogOut size={16} aria-hidden="true" /> {saving ? "Recording…" : "Check out"}
            </button>
          ) : (
            <button className="org-secondary-btn attendance-action-btn" disabled title="Only one check-in is allowed per day">
              <CalendarDays size={16} aria-hidden="true" /> Completed for today
            </button>
          )}
        </section>

        {isAdmin ? (
          <>
            <section className="org-stats-grid attendance-stats-grid">
              <article className="org-stat-card">
                <span>ORGANIZATION MEMBERS</span><strong>{summary?.teamMembers ?? 0}</strong><small>Active team members</small>
              </article>
              <article className="org-stat-card">
                <span>CHECKED IN</span><strong className="org-green">{summary?.checkedIn ?? 0}</strong><small>Attendance recorded today</small>
              </article>
              <article className="org-stat-card">
                <span>NOT CHECKED IN</span><strong>{summary?.notCheckedIn ?? 0}</strong><small>Not yet recorded today</small>
              </article>
              <article className="org-stat-card">
                <span>CHECKED OUT</span><strong>{summary?.checkedOut ?? 0}</strong><small>Workday completed today</small>
              </article>
            </section>

            <section className="org-card attendance-records-card">
              <div className="org-section-heading">
                <div>
                  <span className="org-eyebrow">ORGANIZATION · {dateKey || "TODAY"}</span>
                  <h2>Team attendance</h2>
                </div>
                <span className="org-count-pill">{visibleRecords.length} members</span>
              </div>

              <div className="org-toolbar attendance-toolbar">
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, or department" aria-label="Search attendance" />
                <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter attendance status">
                  <option>All</option>
                  <option>Present</option>
                  <option>Half day</option>
                  <option>In progress</option>
                  <option>Not checked in</option>
                </select>
              </div>

              <div className="org-table-wrap attendance-team-scroll" role="region" aria-label="Team attendance records" tabIndex={0}>
                <table className="org-table attendance-table">
                  <thead><tr><th>Team member</th><th>Role</th><th>Department</th><th>Check in</th><th>Check out</th><th>Hours</th><th>Status</th></tr></thead>
                  <tbody>
                    {visibleRecords.map((record) => {
                      const member = record.user || {};
                      const status = recordStatus(record);
                      const duration = record.durationSeconds ?? (record.checkInAt && !record.checkOutAt ? Math.max(0, Math.floor((now - new Date(record.checkInAt).getTime()) / 1000)) : null);
                      return (
                        <tr key={member._id || record._id}>
                          <td><div className="org-person-cell"><span>{(member.fullName || "U").charAt(0).toUpperCase()}</span><div><strong>{member.fullName || "Workspace user"}</strong><small>{member.email || member.employeeId || ""}</small></div></div></td>
                          <td>{roleLabel(member.role)}</td>
                          <td>{member.department?.name || "Not assigned"}</td>
                          <td>{formatTime(record.checkInAt)}</td>
                          <td>{formatTime(record.checkOutAt)}</td>
                          <td>{formatDuration(duration)}</td>
                          <td><span className={`org-status-badge ${statusBadgeClass(status)}`}>{status}</span></td>
                        </tr>
                      );
                    })}
                    {!visibleRecords.length && <tr><td colSpan="7" className="org-empty">{loading ? "Loading organization attendance…" : "No matching team members."}</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <section className="org-card attendance-personal-card">
            <div className="org-section-heading">
              <div><span className="org-eyebrow">PRIVATE ATTENDANCE RECORD</span><h2>Today's attendance</h2></div>
              <span className="org-count-pill"><Users size={14} aria-hidden="true" /> Visible only to you</span>
            </div>
            <div className="attendance-personal-record">
              <div><span>Check in</span><strong>{formatTime(ownRecord?.checkInAt)}</strong></div>
              <div><span>Check out</span><strong>{formatTime(ownRecord?.checkOutAt)}</strong></div>
              <div><span>Hours recorded</span><strong>{formatDuration(elapsedSeconds)}</strong></div>
              <div><span>Status</span><strong>{recordStatus(ownRecord)}</strong></div>
            </div>
            <p className="attendance-privacy-note"><Clock3 size={14} aria-hidden="true" /> Your attendance is visible to you. Administrators can review attendance for their organization.</p>
          </section>
        )}

        <section className="org-card attendance-calendar-card">
          <div className="org-section-heading attendance-calendar-heading">
            <div>
              <span className="org-eyebrow">YOUR ATTENDANCE</span>
              <h2>Yearly attendance calendar</h2>
              <p>Present, half-day, and approved leave dates at a glance.</p>
            </div>
            <div className="attendance-calendar-controls">
              <button type="button" className="org-secondary-btn attendance-calendar-arrow" onClick={() => shiftCalendarMonth(-1)} aria-label="Previous month">
                <ChevronLeft size={17} />
              </button>
              <select
                aria-label="Calendar month"
                value={calendarMonth.getMonth()}
                onChange={(event) => setCalendarMonth(new Date(calendarMonth.getFullYear(), Number(event.target.value), 1))}
              >
                {monthNames.map((name, index) => <option value={index} key={name}>{name}</option>)}
              </select>
              <input
                aria-label="Calendar year"
                type="number"
                min="2000"
                max="2100"
                value={calendarMonth.getFullYear()}
                onChange={(event) => {
                  const year = Number(event.target.value);
                  if (year >= 2000 && year <= 2100) setCalendarMonth(new Date(year, calendarMonth.getMonth(), 1));
                }}
              />
              <button type="button" className="org-secondary-btn attendance-calendar-arrow" onClick={() => shiftCalendarMonth(1)} aria-label="Next month">
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
          {calendarError && <div className="org-feedback attendance-feedback error" role="alert">{calendarError}</div>}
          <div className="attendance-calendar-summary">
            <article><span>PRESENT</span><strong>{calendarSummary?.present ?? 0}</strong></article>
            <article><span>HALF DAYS</span><strong>{calendarSummary?.halfDays ?? 0}</strong></article>
            <article><span>LEAVE</span><strong>{calendarSummary?.leave ?? 0}</strong></article>
            <article className="attendance-leave-balance"><span>LEAVES LEFT · {monthYearLabel.toUpperCase()}</span><strong>{calendarSummary?.leaveRemaining ?? 3} / 3</strong></article>
          </div>
          <div className="attendance-calendar-toolbar">
            <strong>{monthYearLabel}</strong>
            {calendarLoading && <span>Updating calendar…</span>}
          </div>
          <div className="attendance-calendar-grid" role="grid" aria-label={`Attendance for ${monthYearLabel}`}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div className="attendance-calendar-weekday" role="columnheader" key={day}>{day}</div>
            ))}
            {calendarCells.map((cell) => (
              <div
                className={`attendance-calendar-day ${cell.empty ? "is-empty" : ""} ${cell.date?.status ? `is-${cell.date.status.replace("_", "-")}` : ""}`}
                role="gridcell"
                key={cell.key}
                title={cell.date ? `${formatDate(cell.key)} · ${cell.date.status.replace("_", " ")}` : undefined}
                aria-label={cell.date ? `${formatDate(cell.key)}, ${cell.date.status.replace("_", " ")}` : undefined}
              >
                {!cell.empty && (
                  <>
                    <span>{cell.day}</span>
                    <small>{cell.date?.status === "half_day" ? "Half day" : cell.date?.status === "in_progress" ? "In progress" : cell.date?.status === "unmarked" ? "" : cell.date?.status || ""}</small>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="attendance-calendar-legend" aria-label="Calendar legend">
            <span><i className="is-present" /> Present · 5+ hours</span>
            <span><i className="is-half-day" /> Half day · under 5 hours</span>
            <span><i className="is-leave" /> Approved leave</span>
            <span><i className="is-in-progress" /> In progress</span>
          </div>
          <p className="attendance-calendar-note">Leave is counted by calendar day, including weekends. Unmarked dates are not automatically treated as leave.</p>
        </section>

        <section className="org-card attendance-leave-card">
          <div className="org-section-heading">
            <div>
              <span className="org-eyebrow">LEAVE MANAGEMENT</span>
              <h2>Request time off</h2>
              <p>Up to 3 approved calendar days of leave per month.</p>
            </div>
            <span className="org-count-pill">{calendarSummary?.leaveRemaining ?? 3} leaves left · {monthYearLabel}</span>
          </div>
          {leaveError && <div className="org-feedback attendance-feedback error" role="alert">{leaveError}</div>}
          {leaveMessage && <div className="org-feedback" role="status">{leaveMessage}</div>}
          <form className="attendance-leave-form" onSubmit={submitLeave}>
            <label>
              Start date
              <input
                type="date"
                required
                min={minLeaveStartDate}
                max="2100-12-31"
                value={leaveForm.startDateKey}
                onChange={(event) => {
                  const val = event.target.value;
                  setLeaveForm((current) => ({
                    ...current,
                    startDateKey: val,
                    endDateKey: current.endDateKey && current.endDateKey < val ? val : current.endDateKey,
                  }));
                }}
              />
            </label>
            <label>
              End date
              <input
                type="date"
                required
                min={leaveForm.startDateKey || minLeaveStartDate}
                max="2100-12-31"
                value={leaveForm.endDateKey}
                onChange={(event) => setLeaveForm((current) => ({ ...current, endDateKey: event.target.value }))}
              />
            </label>
            <div
              style={{
                gridColumn: "1 / -1",
                fontSize: "12px",
                color: isCheckedInToday ? "#fbbf24" : "var(--mist)",
                marginTop: "-4px",
                marginBottom: "6px"
              }}
            >
              {isCheckedInToday
                ? "⚠️ You are checked in today. Leave can only be requested for future dates starting tomorrow."
                : "ℹ️ Leave can only be applied for today (before checking in) or future dates."}
            </div>
            <label className="attendance-leave-reason">
              Reason
              <textarea required maxLength={1000} rows={3} value={leaveForm.reason} onChange={(event) => setLeaveForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Briefly describe your leave request" />
            </label>
            <button className="org-primary-btn attendance-leave-submit" type="submit" disabled={leaveSaving}>
              <Send size={15} aria-hidden="true" /> {leaveSaving ? "Submitting…" : isAdmin ? "Submit (auto-approved)" : "Submit leave request"}
            </button>
          </form>
          <p className="attendance-leave-policy">
            {isAdmin
              ? "Your leave requests are approved automatically, subject to the monthly limit."
              : isManager
                ? "Manager leave requests are reviewed by HR & Hiring or an administrator."
                : isExecutive
                  ? "Executive leave requests are reviewed by an administrator. You can review employee requests assigned directly to you."
                  : isHiringDepartmentMember
                    ? "HR & Hiring leave requests are reviewed by an administrator. You can review manager requests and employee requests outside HR & Hiring."
                    : "Employee leave requests can be reviewed by your assigned manager, HR & Hiring, or an administrator."}
          </p>
        </section>

        <section className="org-card attendance-records-card attendance-leave-requests-card">
          <div className="org-section-heading">
            <div>
              <span className="org-eyebrow">{isAdmin ? "ORGANIZATION REQUESTS" : isHiringDepartmentMember ? "EMPLOYEE & MANAGER REQUESTS" : isManager || isExecutive ? "YOUR TEAM REQUESTS" : "YOUR REQUESTS"}</span>
              <h2>{canReviewLeaves ? (isManager || isExecutive ? "Team leave approvals" : "Leave approvals") : "Your leave requests"}</h2>
            </div>
            <span className="org-count-pill">{leaveRequests.length}{leaveHasMore ? ` of ${leaveTotal}` : ""} {canReviewLeaves ? "awaiting review" : "requests"}</span>
          </div>
          {leaveLoading && !leaveRequests.length ? <p>Loading leave requests…</p> : (
            <div className="org-table-wrap attendance-leave-scroll" role="region" aria-label="Leave requests" tabIndex={0}>
              <table className="org-table attendance-leave-table">
                <thead>
                  <tr>
                    {showLeaveApprovalColumns && <th>Team member</th>}
                    <th>Dates</th><th>Reason</th><th>Status</th><th>Reviewed by</th>
                    {showLeaveApprovalColumns && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.map((request) => {
                    const member = typeof request.user === "object" ? request.user : {};
                    const canReview = request.status === "pending" && (
                      isAdmin || (
                        isHiringDepartmentMember && (
                          member.role === "manager" ||
                          (member.role === "employee" && !isHiringDepartment(member))
                        )
                      ) || (
                        (isManager || isExecutive) &&
                        member.role === "employee" &&
                        referenceId(member.manager) === String(user?._id) &&
                        !isHiringDepartment(member)
                      )
                    );
                    return (
                      <tr key={request._id}>
                        {showLeaveApprovalColumns && <td>{member.fullName || "Workspace user"}{member.role && <small className="attendance-request-role">{roleLabel(member.role)}</small>}</td>}
                        <td>{request.startDateKey === request.endDateKey ? formatDate(request.startDateKey) : `${formatDate(request.startDateKey)} – ${formatDate(request.endDateKey)}`}</td>
                        <td className="attendance-leave-reason-cell">{request.reason}</td>
                        <td><span className={`org-status-badge ${request.status === "approved" ? "present" : request.status}`}>{request.status}</span></td>
                        <td>{request.reviewedBy?.fullName || (request.status === "pending" ? "Awaiting review" : "—")}</td>
                        {showLeaveApprovalColumns && (
                          <td>
                            {canReview ? (
                              <div className="attendance-leave-actions">
                                <button type="button" aria-label={`Approve leave for ${member.fullName || "employee"}`} disabled={leaveSaving} onClick={() => decideLeave(request._id, "approved")}><Check size={15} /></button>
                                <button type="button" aria-label={`Reject leave for ${member.fullName || "employee"}`} disabled={leaveSaving} onClick={() => decideLeave(request._id, "rejected")}><X size={15} /></button>
                              </div>
                            ) : request.status === "pending" && isHiringDepartment(member) && isAdmin ? "HR & Hiring leave" : "—"}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {!leaveRequests.length && <tr><td colSpan={showLeaveApprovalColumns ? 6 : 4} className="org-empty">{canReviewLeaves ? "No pending leave approvals." : "No leave requests yet."}</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          {leaveHasMore && (
            <div className="attendance-history-actions">
              <button
                className="org-secondary-btn"
                disabled={leaveLoading}
                onClick={() => loadLeaveRequests(leavePage + 1, true)}
              >
                {leaveLoading ? "Loading…" : canReviewLeaves ? "Load more approvals" : "Load more leave requests"}
              </button>
            </div>
          )}
        </section>

        {canReviewLeaves && (
          <section className="org-card attendance-records-card attendance-history-card attendance-my-leave-card">
            <div className="org-section-heading">
              <div>
                <span className="org-eyebrow">YOUR LEAVE HISTORY</span>
                <h2>Your requests</h2>
              </div>
              <span className="org-count-pill">{myLeaveRequests.length}{myLeaveHasMore ? ` of ${myLeaveTotal}` : ""} requests</span>
            </div>
            <div className="org-table-wrap attendance-leave-scroll" role="region" aria-label="Your leave request history" tabIndex={0}>
              <table className="org-table attendance-leave-table">
                <thead><tr><th>Dates</th><th>Reason</th><th>Status</th><th>Reviewed by</th></tr></thead>
                <tbody>
                  {myLeaveRequests.map((request) => (
                    <tr key={request._id}>
                      <td>{request.startDateKey === request.endDateKey ? formatDate(request.startDateKey) : `${formatDate(request.startDateKey)} – ${formatDate(request.endDateKey)}`}</td>
                      <td className="attendance-leave-reason-cell">{request.reason}</td>
                      <td><span className={`org-status-badge ${request.status === "approved" ? "present" : request.status}`}>{request.status}</span></td>
                      <td>{request.reviewedBy?.fullName || (request.status === "pending" ? "Awaiting review" : "—")}</td>
                    </tr>
                  ))}
                  {!myLeaveRequests.length && <tr><td colSpan="4" className="org-empty">You have not submitted any leave requests.</td></tr>}
                </tbody>
              </table>
            </div>
            {myLeaveHasMore && (
              <div className="attendance-history-actions">
                <button className="org-secondary-btn" disabled={leaveLoading} onClick={() => loadMyLeaveRequests(myLeavePage + 1, true)}>
                  {leaveLoading ? "Loading…" : "Load more of your requests"}
                </button>
              </div>
            )}
          </section>
        )}

        <section className="org-card attendance-records-card attendance-history-card">
          <div className="org-section-heading">
            <div>
              <span className="org-eyebrow">{isAdmin ? "ORGANIZATION RECORDS" : "PRIVATE ATTENDANCE RECORD"}</span>
              <h2>Attendance history</h2>
            </div>
            <span className="org-count-pill">{history.length} of {historyTotal} records</span>
          </div>
          {historyError && <div className="org-feedback attendance-feedback error" role="alert">{historyError}</div>}
          <div className="org-table-wrap attendance-history-scroll" role="region" aria-label="Attendance history" tabIndex={0}>
            <table className="org-table attendance-table attendance-history-table">
              <thead>
                <tr>
                  {isAdmin && <th>Team member</th>}
                  {isAdmin && <th>Role</th>}
                  {isAdmin && <th>Department</th>}
                  <th>Date</th><th>Check in</th><th>Check out</th><th>Hours</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record) => {
                  const member = typeof record.user === "object" ? record.user : {};
                  const status = recordStatus(record);
                  return (
                    <tr key={record._id}>
                      {isAdmin && (
                        <td>
                          <div className="org-person-cell">
                            <span>{(member.fullName || "U").charAt(0).toUpperCase()}</span>
                            <div><strong>{member.fullName || "Workspace user"}</strong><small>{member.email || member.employeeId || ""}</small></div>
                          </div>
                        </td>
                      )}
                      {isAdmin &&                       <td>{roleLabel(member.role)}</td>}
                      {isAdmin && <td>{member.department?.name || "Not assigned"}</td>}
                      <td>{formatDate(record.dateKey)}</td>
                      <td>{formatTime(record.checkInAt)}</td>
                      <td>{formatTime(record.checkOutAt)}</td>
                      <td>{formatDuration(record.durationSeconds)}</td>
                      <td><span className={`org-status-badge ${statusBadgeClass(status)}`}>{status}</span></td>
                    </tr>
                  );
                })}
                {!history.length && (
                  <tr><td colSpan={isAdmin ? 8 : 5} className="org-empty">{historyLoading ? "Loading attendance history…" : "No saved attendance records yet."}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {historyHasMore && (
            <div className="attendance-history-actions">
              <button
                className="org-secondary-btn"
                disabled={historyLoading}
                onClick={() => loadHistory(nextHistoryPage, true)}
              >
                {historyLoading ? "Loading…" : "Load older records"}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
