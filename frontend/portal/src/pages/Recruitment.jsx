import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import { isHiringDepartment } from "../utils/departmentAccess";
import { ORGANIZATION_API_BASE_URL, RECRUITMENT_API_BASE_URL } from "../config/api";
import "./Recruitment.css";
const API = "https://hiremind-organization.onrender.com/api";
const API_BASE = RECRUITMENT_API_BASE_URL;

const TABS = ["Overview", "Jobs", "Screening", "Candidates", "Interviews", "Emails"];
const APPLICATION_STATUSES = [
  "applied", "resume_processing", "awaiting_review", "approved", "shortlisted",
  "offer_extended", "hired", "rejected", "not_selected",
];
const INITIAL_JOB = {
  companyName: "", title: "", department: "", employmentType: "", workArrangement: "",
  location: "", hiringManagerName: "", openings: "1", applicationDeadline: "",
  minimumExperience: "0", preferredExperience: "0", description: "", requiredSkills: "",
  preferredSkills: "", educationRequirements: "", certifications: "", responsibilities: "",
};

function organizationId(user) {
  const organization = user?.organization;
  return typeof organization === "string" ? organization : organization?._id || "";
}

function Field({ label, wide = false, children, hint }) {
  return (
    <label className={`recruitment-field${wide ? " wide" : ""}`}>
      <span>{label}</span>
      {hint && <small>{hint}</small>}
      {children}
    </label>
  );
}

function Empty({ children }) {
  return <div className="recruitment-empty">{children}</div>;
}

function StatusBadge({ value = "draft" }) {
  return <span className={`recruitment-badge status-${String(value).toLowerCase().replaceAll("_", "-")}`}>{String(value).replaceAll("_", " ")}</span>;
}

function listValue(value) {
  return String(value || "").split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

function dateLabel(value, options) {
  return value ? new Date(value).toLocaleString(undefined, options) : "Date unavailable";
}

export default function Recruitment() {
  const [user, setUser] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [serviceStatus, setServiceStatus] = useState("Checking recruitment service…");
  const [activeTab, setActiveTab] = useState("Overview");
  const [notice, setNotice] = useState(null);
  const [metrics, setMetrics] = useState({});
  const [activity, setActivity] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jobSearch, setJobSearch] = useState("");
  const [jobStatus, setJobStatus] = useState("");
  const [jobForm, setJobForm] = useState(INITIAL_JOB);
  const [editingJobId, setEditingJobId] = useState("");
  const [saving, setSaving] = useState(false);
  const [screeningJobId, setScreeningJobId] = useState("");
  const [screeningStatus, setScreeningStatus] = useState("");
  const [screening, setScreening] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateHistories, setCandidateHistories] = useState({});
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [eligibleApplications, setEligibleApplications] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [emailForm, setEmailForm] = useState({
    applicationId: "", templateKey: "", companyName: "HireMind", subject: "", body: "",
  });
  const [emailPreview, setEmailPreview] = useState(null);
  const candidateQueryTimer = useRef(null);

  const canManageJobs = ["admin", "recruiter", "executive"].includes(user?.role) || isHiringDepartment(user);
  const canDeleteJobs = user?.role === "admin";
  const backendRole = user?.role === "recruiter" ? "executive" : user?.role;
  const userForSidebar = useMemo(() => user && ({
    ...user,
    id: user._id,
    orgId: organizationId(user),
  }), [user]);

  const request = useCallback(async (path, options = {}) => {
    const headers = {
      "x-ems-user-id": user?._id || "",
      "x-ems-user-name": user?.fullName || "",
      "x-ems-user-role": backendRole || "",
      "x-ems-user-department": user?.department?.name || "",
      "x-ems-organization-id": organizationId(user),
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    };
    let response;
    try {
      response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } catch {
      throw new Error(`Could not reach the recruitment service at ${API_BASE}. Start all local services with npm run dev from the HireMind_AI root.`);
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Recruitment API returned ${response.status}.`);
    return payload;
  }, [backendRole, user]);

  const notify = useCallback((message, error = false) => {
    setNotice({ message, error });
  }, []);

  const loadOverview = useCallback(async () => {
    const data = await request("/dashboard");
    setMetrics(data.metrics || {});
    setActivity(data.recentActivity || []);
  }, [request]);

  const loadJobs = useCallback(async () => {
    const params = new URLSearchParams({ limit: "100" });
    if (jobStatus) params.set("status", jobStatus);
    if (jobSearch.trim()) params.set("search", jobSearch.trim());
    const data = await request(`/jobs?${params}`);
    setJobs(data.items || []);
    return data.items || [];
  }, [jobSearch, jobStatus, request]);

  const loadApplications = useCallback(async () => {
    const data = await request("/applications?limit=100");
    setApplications(data.items || []);
    return data.items || [];
  }, [request]);

  const loadInterviews = useCallback(async () => {
    const [interviewData, applicationData, templateData, jobData] = await Promise.all([
      request("/interviews"),
      request("/applications?limit=100"),
      request("/ai-interviews/templates"),
      request("/jobs?limit=100"),
    ]);
    setInterviews(interviewData.items || []);
    setApplications(applicationData.items || []);
    setTemplates(templateData.items || []);

    const bundles = await Promise.all((jobData.items || []).map(async (job) => {
      const [screeningData, invitationData] = await Promise.all([
        request(`/screening/jobs/${encodeURIComponent(job._id)}`),
        request(`/ai-interviews/jobs/${encodeURIComponent(job._id)}/invitations`),
      ]);
      return {
        job,
        applications: screeningData.items || [],
        invitations: invitationData.items || [],
      };
    }));
    const appById = new Map();
    const inviteRows = [];
    for (const bundle of bundles) {
      for (const item of bundle.applications) appById.set(String(item._id), { ...item, job: bundle.job });
      inviteRows.push(...bundle.invitations.map((item) => ({
        ...item,
        application: appById.get(String(item.applicationId)),
        job: bundle.job,
      })));
    }
    const inviteByApplication = new Set(inviteRows.map((item) => String(item.applicationId)));
    const closedStatuses = ["rejected", "not_selected", "hired"];
    setEligibleApplications([...appById.values()].filter((item) =>
      item.screeningStatus === "completed" &&
      !closedStatuses.includes(item.status) &&
      !inviteByApplication.has(String(item._id))
    ));
    setInvitations(inviteRows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
  }, [request]);

  const loadCandidates = useCallback(async (query = candidateSearch) => {
    const data = await request(`/candidates${query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ""}`);
    setCandidates(data.items || []);
  }, [candidateSearch, request]);

  const loadEmailWorkspace = useCallback(async () => {
    const [templateData, logData, applicationData] = await Promise.all([
      request("/emails/templates"),
      request("/emails/logs"),
      request("/applications?limit=100"),
    ]);
    setEmailTemplates(templateData.templates || []);
    setEmailLogs(logData.items || []);
    setEmailConfigured(Boolean(logData.configured));
    setApplications(applicationData.items || []);
  }, [request]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      fetch(`${API_BASE}/health`).then((response) => {
        if (!response.ok) throw new Error(`Recruitment service returned ${response.status}.`);
        return response.json();
      }),
      fetch(`${ORGANIZATION_API_BASE_URL}/auth/me`, { credentials: "include" }).then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.user) throw new Error(data.message || "Sign in to access the recruitment workspace.");
        return data.user;
      }),
    ]).then(([healthResult, profileResult]) => {
      if (!active) return;
      if (healthResult.status === "fulfilled") {
        const health = healthResult.value;
        setServiceStatus(health.status === "healthy" ? "Recruitment service ready" : `Recruitment service ${health.status}`);
      } else {
        setServiceStatus("Recruitment service unavailable");
        notify(healthResult.reason.message, true);
      }
      if (profileResult.status === "fulfilled") {
        const profile = profileResult.value;
        if (
          !["admin", "recruiter", "executive"].includes(profile.role) &&
          !isHiringDepartment(profile)
        ) {
          notify("Recruitment access is limited to administrators, executives, and HR & Hiring department members.", true);
          return;
        }
        setUser(profile);
      } else {
        notify(profileResult.reason.message, true);
      }
    }).finally(() => {
      if (active) setPageLoading(false);
    });
    return () => { active = false; };
  }, [notify]);

  useEffect(() => {
    if (!user) return;
    loadOverview().catch((error) => notify(error.message, true));
  }, [loadOverview, notify, user]);

  useEffect(() => {
    if (!user) return;
    const loadActiveView = async () => {
      try {
        if (activeTab === "Jobs") await loadJobs();
        if (activeTab === "Screening") {
          const nextJobs = jobs.length ? jobs : await loadJobs();
          const nextJobId = screeningJobId || nextJobs[0]?._id || "";
          if (!screeningJobId && nextJobId) setScreeningJobId(nextJobId);
          if (nextJobId) {
            const params = new URLSearchParams();
            if (screeningStatus) params.set("status", screeningStatus);
            const data = await request(`/screening/jobs/${encodeURIComponent(nextJobId)}${params.size ? `?${params}` : ""}`);
            const items = data.items || [];
            setScreening(screeningStatus ? items.filter((item) => item.status === screeningStatus) : items);
          } else setScreening([]);
        }
        if (activeTab === "Candidates") await loadCandidates();
        if (activeTab === "Interviews") await loadInterviews();
        if (activeTab === "Emails") await loadEmailWorkspace();
      } catch (error) {
        notify(error.message, true);
      }
    };
    loadActiveView();
  }, [activeTab, user, screeningJobId, screeningStatus, jobSearch, jobStatus]);

  useEffect(() => () => {
    if (candidateQueryTimer.current) window.clearTimeout(candidateQueryTimer.current);
  }, []);

  const updateJobField = (event) => {
    const { name, value } = event.target;
    setJobForm((current) => ({ ...current, [name]: value }));
  };

  const saveJob = async (event) => {
    event.preventDefault();
    const body = {
      ...jobForm,
      openings: Number(jobForm.openings),
      minimumExperience: Number(jobForm.minimumExperience),
      preferredExperience: Number(jobForm.preferredExperience),
    };
    for (const key of ["requiredSkills", "preferredSkills", "educationRequirements", "certifications", "responsibilities"]) {
      body[key] = listValue(body[key]);
    }
    setSaving(true);
    try {
      await request(editingJobId ? `/jobs/${editingJobId}` : "/jobs", {
        method: editingJobId ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      notify(editingJobId ? "Job updated. Review it and publish when ready." : "Job saved as a draft. Publish it when ready.");
      setJobForm(INITIAL_JOB);
      setEditingJobId("");
      await loadJobs();
      await loadOverview();
    } catch (error) {
      notify(error.message, true);
    } finally {
      setSaving(false);
    }
  };

  const editJob = (job) => {
    setEditingJobId(job._id);
    setJobForm({
      ...INITIAL_JOB,
      ...job,
      applicationDeadline: job.applicationDeadline ? new Date(job.applicationDeadline).toISOString().slice(0, 10) : "",
      requiredSkills: (job.requiredSkills || []).join(", "),
      preferredSkills: (job.preferredSkills || []).join(", "),
      educationRequirements: (job.educationRequirements || []).join(", "),
      certifications: (job.certifications || []).join(", "),
      responsibilities: (job.responsibilities || []).join("\n"),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const runJobAction = async (job, action) => {
    if (action === "delete" && !window.confirm("Permanently delete this job and its job-specific recruitment records? Candidate profiles and unrelated applications will remain. This cannot be undone.")) return;
    try {
      if (action === "delete") {
        await request(`/jobs/${job._id}`, { method: "DELETE" });
        notify("Job-specific recruitment records were removed.");
      } else {
        const outcome = await request(`/jobs/${job._id}/${action}`, { method: "POST" });
        notify(action === "analyze"
          ? `Job analyzed. AI found ${outcome.profile?.skills?.length || 0} skill requirement(s).`
          : `Job ${action}d.`);
      }
      await loadJobs();
      await loadOverview();
    } catch (error) {
      notify(error.message, true);
    }
  };

  const loadScreeningForJob = async (jobId, status = screeningStatus) => {
    setScreeningJobId(jobId);
    if (!jobId) {
      setScreening([]);
      return;
    }
    try {
      const query = status ? `?status=${encodeURIComponent(status)}` : "";
      const data = await request(`/screening/jobs/${encodeURIComponent(jobId)}${query}`);
      const items = data.items || [];
      setScreening(status ? items.filter((item) => item.status === status) : items);
    } catch (error) {
      notify(error.message, true);
    }
  };

  const screeningAction = async (item, action, status) => {
    try {
      if (action === "resume") {
        const response = await fetch(`${API_BASE}/applications/${encodeURIComponent(item._id)}/resume`, {
          headers: {
            "x-ems-user-id": user._id,
            "x-ems-user-name": user.fullName || "",
            "x-ems-user-role": backendRole,
            "x-ems-organization-id": organizationId(user),
          },
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Resume download failed.");
        }
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement("a");
        link.href = url;
        link.download = item.resumeDocument?.originalName || `${item.candidateId?.fullName || "candidate"}-resume`;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }
      if (action === "retry") {
        await request(`/screening/applications/${encodeURIComponent(item._id)}/retry`, { method: "POST" });
        notify("Screening completed.");
      } else {
        if (status === "rejected" && !window.confirm("Reject this application? The candidate may leave the active Candidates list.")) return;
        await request(`/applications/${encodeURIComponent(item._id)}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        notify("Application status updated.");
      }
      await loadScreeningForJob(screeningJobId);
      await loadOverview();
    } catch (error) {
      notify(error.message, true);
    }
  };

  const loadCandidateHistory = async (candidateId) => {
    try {
      const data = await request(`/candidates/${encodeURIComponent(candidateId)}`);
      setCandidateHistories((current) => ({ ...current, [candidateId]: data }));
    } catch (error) {
      notify(error.message, true);
    }
  };

  const scheduleInterview = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form).entries());
    const interviewerName = String(fields.interviewerName || "").trim();
    const body = {
      ...fields,
      interviewers: [{ id: interviewerName.toLowerCase().replace(/\W+/g, "-"), name: interviewerName }],
    };
    delete body.interviewerName;
    if (body.mode === "in_person") {
      body.location = body.meetingLink;
      delete body.meetingLink;
    }
    try {
      await request("/interviews", { method: "POST", body: JSON.stringify(body) });
      form.reset();
      notify("Interview scheduled.");
      await loadInterviews();
      await loadOverview();
    } catch (error) {
      notify(error.message, true);
    }
  };

  const sendAIInvitation = async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    try {
      const result = await request(`/ai-interviews/applications/${encodeURIComponent(values.get("applicationId"))}/invitations`, {
        method: "POST",
        body: JSON.stringify({ templateKey: values.get("templateKey") }),
      });
      notify(result.delivered ? "AI interview invitation emailed." : (result.error || "The invitation email was not sent."), !result.delivered);
      await loadInterviews();
    } catch (error) {
      notify(error.message, true);
      await loadInterviews().catch((refreshError) => notify(refreshError.message, true));
    }
  };

  const invitationAction = async (invitation, action) => {
    if (action === "revoke" && !window.confirm("Revoke this invitation and any in-progress candidate session?")) return;
    try {
      if (action === "report") {
        const data = await request(`/ai-interviews/invitations/${encodeURIComponent(invitation.id)}/report`);
        setInvitations((current) => current.map((item) =>
          item.id === invitation.id ? { ...item, reportData: data } : item
        ));
      } else if (action === "resend") {
        const result = await request(`/ai-interviews/invitations/${encodeURIComponent(invitation.id)}/resend`, { method: "POST" });
        notify(result.delivered ? "A secure interview link was emailed." : (result.error || "The invitation email was not sent."), !result.delivered);
        await loadInterviews();
      } else {
        const result = await request(`/ai-interviews/invitations/${encodeURIComponent(invitation.id)}`, { method: "DELETE" });
        notify(result.cancellationEmailSkipped
          ? "Invitation revoked; no cancellation email was needed."
          : result.cancellationEmailDelivered
            ? "Invitation revoked and candidate notified."
            : "Invitation revoked, but the cancellation email could not be delivered.", !result.cancellationEmailDelivered && !result.cancellationEmailSkipped);
        await loadInterviews();
      }
    } catch (error) {
      notify(error.message, true);
    }
  };

  const submitAIReview = async (event, invitationId) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    try {
      await request(`/ai-interviews/invitations/${encodeURIComponent(invitationId)}/review`, {
        method: "POST",
        body: JSON.stringify({ decision: values.get("decision"), note: values.get("note") }),
      });
      notify("Recruiter review saved. No application status was changed automatically.");
      const invitation = invitations.find((item) => item.id === invitationId);
      if (invitation) await invitationAction(invitation, "report");
    } catch (error) {
      notify(error.message, true);
    }
  };

  const reviewIntegrityEvent = async (invitation, eventId) => {
    try {
      await request(`/ai-interviews/integrity/${encodeURIComponent(eventId)}`, {
        method: "PATCH",
        body: JSON.stringify({ reviewStatus: "reviewed" }),
      });
      notify("Integrity signal review recorded.");
      await invitationAction(invitation, "report");
    } catch (error) {
      notify(error.message, true);
    }
  };

  const updateEmailTemplate = (templateKey) => {
    const template = emailTemplates.find((item) => item.key === templateKey);
    setEmailForm((current) => ({
      ...current,
      templateKey,
      subject: template?.subject || "",
      body: template?.body || "",
    }));
    setEmailPreview(null);
  };

  const previewEmail = async () => {
    try {
      const data = await request("/emails/preview", {
        method: "POST",
        body: JSON.stringify(emailForm),
      });
      setEmailPreview(data);
    } catch (error) {
      notify(error.message, true);
    }
  };

  const sendEmail = async (event) => {
    event.preventDefault();
    if (!emailForm.applicationId || !emailForm.templateKey) {
      notify("Choose an application and email template before sending.", true);
      return;
    }
    if (!window.confirm("Send this email to the selected candidate?")) return;
    try {
      await request("/emails/send", {
        method: "POST",
        body: JSON.stringify({
          ...emailForm,
          confirm: true,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      notify("Email sent and recorded.");
      setEmailPreview(null);
      await loadEmailWorkspace();
    } catch (error) {
      notify(error.message, true);
      await loadEmailWorkspace().catch((refreshError) => notify(refreshError.message, true));
    }
  };

  useEffect(() => {
    if (!emailTemplates.length || emailForm.templateKey) return;
    updateEmailTemplate(emailTemplates[0].key);
  }, [emailTemplates, emailForm.templateKey]);

  const metricCards = [
    ["Active jobs", metrics.activeJobs],
    ["Candidates", metrics.totalCandidates],
    ["New applications · 7 days", metrics.newApplications],
    ["Awaiting review", metrics.awaitingReview],
    ["Scheduled interviews", metrics.scheduledInterviews],
    ["Offers", metrics.offers],
  ];

  if (pageLoading) {
    return <main className="recruitment-loading">Loading recruitment workspace…</main>;
  }

  if (!user) {
    return <main className="recruitment-loading"><div className="recruitment-alert error">{notice?.message || "Sign in to access recruitment."}</div></main>;
  }

  return (
    <div className="dashboard-shell">
      <Sidebar user={userForSidebar} role={user.role} />
      <main className="workday-main recruitment-page">
        <header className="recruitment-header">
          <div>
            <p className="recruitment-eyebrow">TALENT OPERATIONS</p>
            <h1>Recruitment workspace</h1>
            <p>Manage jobs, applicants, AI screening, and interviews for your organization.</p>
          </div>
          <span className={`recruitment-service ${serviceStatus.includes("ready") ? "ready" : "error"}`}>
            <i />{serviceStatus}
          </span>
        </header>

        {notice && (
          <div className={`recruitment-alert ${notice.error ? "error" : ""}`} role={notice.error ? "alert" : "status"}>
            <span>{notice.message}</span>
            <button type="button" aria-label="Dismiss message" onClick={() => setNotice(null)}>×</button>
          </div>
        )}

        <nav className="recruitment-tabs" aria-label="Recruitment sections">
          {TABS.map((tab) => (
            <button key={tab} type="button" className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </nav>

        {activeTab === "Overview" && (
          <section className="recruitment-view">
            <div className="recruitment-metric-grid">
              {metricCards.map(([label, value]) => (
                <article className="recruitment-metric" key={label}>
                  <span>{label}</span><strong>{value ?? 0}</strong>
                </article>
              ))}
            </div>
            <section className="recruitment-panel">
              <div className="recruitment-panel-heading"><div><span className="recruitment-eyebrow">WORKSPACE PULSE</span><h2>Recent activity</h2></div></div>
              <div className="recruitment-activity-list">
                {activity.length ? activity.map((item) => (
                  <article className="recruitment-activity" key={item._id}>
                    <div><strong>{item.actor?.name || "A recruiter"}</strong> {item.action}{item.metadata?.title ? ` · ${item.metadata.title}` : ""}</div>
                    <time>{dateLabel(item.createdAt)}</time>
                  </article>
                )) : <Empty>No recruitment activity yet.</Empty>}
              </div>
            </section>
          </section>
        )}

        {activeTab === "Jobs" && (
          <section className="recruitment-view recruitment-columns">
            {canManageJobs && (
              <section className="recruitment-panel">
                <div className="recruitment-panel-heading"><div><span className="recruitment-eyebrow">JOB DETAILS</span><h2>{editingJobId ? "Edit job" : "Create a job"}</h2></div><span className="recruitment-hint">Saved to your organization only</span></div>
                <form className="recruitment-form-grid" onSubmit={saveJob}>
                  <Field label="Company name"><input name="companyName" maxLength="120" required value={jobForm.companyName} onChange={updateJobField} placeholder="Your organization" /></Field>
                  <Field label="Job title"><input name="title" maxLength="120" required value={jobForm.title} onChange={updateJobField} placeholder="Senior Product Designer" /></Field>
                  <Field label="Department"><input name="department" maxLength="100" required value={jobForm.department} onChange={updateJobField} placeholder="Design" /></Field>
                  <Field label="Employment type"><select name="employmentType" required value={jobForm.employmentType} onChange={updateJobField}><option value="">Choose</option><option value="full-time">Full-time</option><option value="part-time">Part-time</option><option value="contract">Contract</option><option value="internship">Internship</option></select></Field>
                  <Field label="Work arrangement"><select name="workArrangement" required value={jobForm.workArrangement} onChange={updateJobField}><option value="">Choose</option><option value="onsite">On-site</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option></select></Field>
                  <Field label="Location"><input name="location" value={jobForm.location} onChange={updateJobField} placeholder="Bengaluru, India" /></Field>
                  <Field label="Hiring manager"><input name="hiringManagerName" value={jobForm.hiringManagerName} onChange={updateJobField} placeholder="Name of hiring manager" /></Field>
                  <Field label="Open seats"><input name="openings" type="number" min="1" required value={jobForm.openings} onChange={updateJobField} /></Field>
                  <Field label="Application deadline"><input name="applicationDeadline" type="date" value={jobForm.applicationDeadline} onChange={updateJobField} /></Field>
                  <Field label="Minimum experience (years)"><input name="minimumExperience" type="number" min="0" value={jobForm.minimumExperience} onChange={updateJobField} /></Field>
                  <Field label="Preferred experience (years)"><input name="preferredExperience" type="number" min="0" value={jobForm.preferredExperience} onChange={updateJobField} /></Field>
                  <Field label="Job description" wide><textarea name="description" rows="4" required value={jobForm.description} onChange={updateJobField} placeholder="Describe the role, impact, and success criteria." /></Field>
                  <Field label="Required skills" hint="Comma separated"><input name="requiredSkills" value={jobForm.requiredSkills} onChange={updateJobField} placeholder="Figma, UX research" /></Field>
                  <Field label="Preferred skills" hint="Comma separated"><input name="preferredSkills" value={jobForm.preferredSkills} onChange={updateJobField} placeholder="Design systems" /></Field>
                  <Field label="Education requirements" hint="Comma separated"><input name="educationRequirements" value={jobForm.educationRequirements} onChange={updateJobField} /></Field>
                  <Field label="Certifications" hint="Comma separated"><input name="certifications" value={jobForm.certifications} onChange={updateJobField} /></Field>
                  <Field label="Responsibilities" hint="One per line" wide><textarea name="responsibilities" rows="3" value={jobForm.responsibilities} onChange={updateJobField} /></Field>
                  <div className="recruitment-form-actions wide">
                    <button className="recruitment-primary-btn" disabled={saving}>{saving ? "Saving…" : editingJobId ? "Save changes" : "Save job"}</button>
                    <button className="recruitment-secondary-btn" type="button" onClick={() => { setJobForm(INITIAL_JOB); setEditingJobId(""); }}>Clear</button>
                  </div>
                </form>
              </section>
            )}
            <section className="recruitment-panel">
              <div className="recruitment-panel-heading recruitment-jobs-heading">
                <div><span className="recruitment-eyebrow">OPEN ROLES</span><h2>Your jobs</h2></div>
                <div className="recruitment-toolbar">
                  <input type="search" aria-label="Search jobs" placeholder="Search jobs" value={jobSearch} onChange={(event) => setJobSearch(event.target.value)} />
                  <select aria-label="Filter jobs by status" value={jobStatus} onChange={(event) => setJobStatus(event.target.value)}>
                    <option value="">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="closed">Closed</option><option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div className="recruitment-list">
                {jobs.length ? jobs.map((job) => (
                  <article className="recruitment-job-card" key={job._id}>
                    <div className="recruitment-card-title"><h3>{job.title}</h3><StatusBadge value={job.status} /></div>
                    <p>{job.companyName} · {job.department} · {job.employmentType} · {job.openings} opening{job.openings === 1 ? "" : "s"}</p>
                    <p className="recruitment-hint">{job.location || "Location not specified"}{job.applicationDeadline ? ` · Closes ${dateLabel(job.applicationDeadline, { dateStyle: "medium" })}` : ""}</p>
                    <p className="recruitment-hint">{job.metrics?.applicants || 0} applicants · {job.metrics?.screened || 0} screened{job.aiJobProfile ? " · AI profile available" : ""}</p>
                    <div className="recruitment-actions">
                      <button className="recruitment-primary-btn small" onClick={() => { setScreeningJobId(job._id); setActiveTab("Screening"); }}>View applicants</button>
                      {canManageJobs && job.status === "draft" && <button className="recruitment-secondary-btn small" onClick={() => runJobAction(job, "publish")}>Publish</button>}
                      {canManageJobs && job.status === "published" && <button className="recruitment-secondary-btn small" onClick={() => runJobAction(job, "close")}>Close</button>}
                      {canManageJobs && job.status === "closed" && <button className="recruitment-secondary-btn small" onClick={() => runJobAction(job, "archive")}>Archive</button>}
                      {canManageJobs && <button className="recruitment-secondary-btn small" onClick={() => editJob(job)}>Edit</button>}
                      {canManageJobs && <button className="recruitment-secondary-btn small" onClick={() => runJobAction(job, "analyze")}>Analyze job</button>}
                      {canDeleteJobs && <button className="recruitment-danger-btn small" onClick={() => runJobAction(job, "delete")}>Delete</button>}
                    </div>
                  </article>
                )) : <Empty>No jobs found. Create your first job opening to begin recruiting.</Empty>}
              </div>
            </section>
          </section>
        )}

        {activeTab === "Screening" && (
          <section className="recruitment-view recruitment-panel">
            <div className="recruitment-panel-heading"><div><span className="recruitment-eyebrow">APPLICATION REVIEW</span><h2>Applicants for a job</h2></div></div>
            <div className="recruitment-screening-controls">
              <Field label="Job"><select value={screeningJobId} onChange={(event) => loadScreeningForJob(event.target.value)}><option value="">Choose a job</option>{jobs.map((job) => <option key={job._id} value={job._id}>{job.title} — {job.department} ({job.status})</option>)}</select></Field>
              <Field label="Application status"><select value={screeningStatus} onChange={(event) => setScreeningStatus(event.target.value)}><option value="">All application statuses</option>{APPLICATION_STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></Field>
            </div>
            <p className="recruitment-hint recruitment-note">ATS results are decision support only. Resume documents are downloaded through an organization-scoped endpoint.</p>
            {screening.length ? (
              <div className="recruitment-list">
                {screening.map((item) => {
                  const result = item.screeningResult || {};
                  const canDecide = !["approved", "shortlisted", "rejected", "not_selected", "interview_scheduled", "interview_completed", "offer_extended", "hired"].includes(item.status);
                  return (
                    <article className="recruitment-candidate-card" key={item._id}>
                      <div className="recruitment-card-title"><div><h3>{item.candidateId?.fullName || "Candidate"}</h3><p>{item.candidateId?.email || "No email"} · {item.candidateId?.location || "Location not supplied"}</p></div><StatusBadge value={item.status} /></div>
                      <div className="recruitment-candidate-summary">
                        {item.screeningStatus === "completed" ? <strong className="recruitment-score">{result.overall_score ?? "—"} <small>ATS score</small></strong> : <span>{item.screeningStatus === "pending" ? "Screening pending" : item.screeningStatus === "missing" ? "No resume available" : `Screening ${item.screeningStatus}`}</span>}
                        <span>Applied {dateLabel(item.appliedAt, { dateStyle: "medium" })}</span>
                      </div>
                      {item.screeningFailure && <p className="recruitment-hint">{item.screeningFailure}</p>}
                      <div className="recruitment-actions">
                        {item.resumeAvailable && <button className="recruitment-secondary-btn small" onClick={() => screeningAction(item, "resume")}>Download resume</button>}
                        {["failed", "pending"].includes(item.screeningStatus) && item.resumeAvailable && <button className="recruitment-secondary-btn small" onClick={() => screeningAction(item, "retry")}>Retry screening</button>}
                        {canDecide && <><button className="recruitment-primary-btn small" onClick={() => screeningAction(item, "status", "approved")}>Approve</button><button className="recruitment-secondary-btn small" onClick={() => screeningAction(item, "status", "shortlisted")}>Shortlist</button><button className="recruitment-danger-btn small" onClick={() => screeningAction(item, "status", "rejected")}>Reject</button></>}
                      </div>
                      <details className="recruitment-details">
                        <summary>{item.screeningStatus === "completed" ? "View screening evidence" : "View application details"}</summary>
                        {item.screeningStatus === "completed" ? (
                          <div className="recruitment-evidence-grid">
                            <div><strong>Matched skills</strong><p>{(result.skill_analysis?.matched_required || []).concat(result.skill_analysis?.matched_preferred || []).map((entry) => entry.skill || entry.name || entry).join(", ") || "No direct matches"}</p></div>
                            <div><strong>Related skills</strong><p>{(result.skill_analysis?.related_required || []).concat(result.skill_analysis?.related_preferred || []).map((entry) => entry.skill || entry.name || entry).join(", ") || "No related skills inferred"}</p></div>
                            <div><strong>Gaps to review</strong><p>{(result.gaps || result.critical_gaps || []).map((entry) => entry.skill || entry.name || entry).join(", ") || "No gaps identified"}</p></div>
                            <div><strong>Experience</strong><p>{result.experience_analysis?.reason || "Not analyzed"}</p></div>
                            <div><strong>Education</strong><p>{result.education_analysis?.reason || "Not analyzed"}</p></div>
                            <div><strong>Score note</strong><p>{result.score_note || "Decision support only — recruiter review required."}</p></div>
                          </div>
                        ) : <p>{item.screeningFailure || "No screening result is available."}</p>}
                      </details>
                    </article>
                  );
                })}
              </div>
            ) : <Empty>{screeningJobId ? "No applicants match this filter." : "Choose a job to review applicants."}</Empty>}
          </section>
        )}

        {activeTab === "Candidates" && (
          <section className="recruitment-view recruitment-panel">
            <div className="recruitment-panel-heading"><div><span className="recruitment-eyebrow">TALENT DIRECTORY</span><h2>Candidates</h2></div><input type="search" placeholder="Search name, email, or skill" value={candidateSearch} onChange={(event) => {
              const value = event.target.value;
              setCandidateSearch(value);
              if (candidateQueryTimer.current) window.clearTimeout(candidateQueryTimer.current);
              candidateQueryTimer.current = window.setTimeout(() => loadCandidates(value).catch((error) => notify(error.message, true)), 250);
            }} /></div>
            <div className="recruitment-list">
              {candidates.length ? candidates.map((candidate) => {
                const history = candidateHistories[candidate._id];
                return (
                  <article className="recruitment-candidate-card" key={candidate._id}>
                    <div className="recruitment-card-title"><div><h3>{candidate.fullName}</h3><p>{candidate.email || "No email"} · {candidate.location || "Location not supplied"}</p></div><span className="recruitment-badge">{candidate.applicationCount || 0} active applications</span></div>
                    <button className="recruitment-secondary-btn small" onClick={() => loadCandidateHistory(candidate._id)}>{history ? "Refresh application history" : "View application history"}</button>
                    {history && <div className="recruitment-history">
                      {history.applications?.length ? history.applications.map((item) => {
                        const screeningItem = history.screening?.find((row) => String(row.applicationId) === String(item._id));
                        return <p key={item._id}><strong>{item.jobId?.title || "Removed job"}</strong> · {item.jobId?.companyName || "Company unavailable"} · <StatusBadge value={item.status} /> · {dateLabel(item.appliedAt, { dateStyle: "medium" })}{screeningItem?.status === "completed" ? ` · ATS ${screeningItem.result?.overall_score ?? "—"}` : ""}</p>;
                      }) : <Empty>No applications in this organization.</Empty>}
                    </div>}
                  </article>
                );
              }) : <Empty>No candidates match this search.</Empty>}
            </div>
          </section>
        )}

        {activeTab === "Interviews" && (
          <section className="recruitment-view recruitment-stack">
            <div className="recruitment-columns">
              <section className="recruitment-panel">
                <div className="recruitment-panel-heading"><div><span className="recruitment-eyebrow">SCHEDULE</span><h2>Schedule interview</h2></div><span className="recruitment-hint">Interviewer conflicts are checked</span></div>
                <form className="recruitment-form-grid" onSubmit={scheduleInterview}>
                  <Field label="Application" wide><select name="applicationId" required defaultValue=""><option value="">Choose an applicant</option>{applications.map((item) => <option key={item._id} value={item._id}>{item.candidateId?.fullName || "Candidate"} — {item.jobId?.title || "Job"}</option>)}</select></Field>
                  <Field label="Round"><input name="round" required placeholder="Technical interview" /></Field>
                  <Field label="Mode"><select name="mode" required defaultValue="video"><option value="video">Video</option><option value="phone">Phone</option><option value="in_person">In person</option></select></Field>
                  <Field label="Start time"><input name="startsAt" type="datetime-local" required /></Field>
                  <Field label="End time"><input name="endsAt" type="datetime-local" required /></Field>
                  <Field label="Time zone"><input name="timeZone" defaultValue="Asia/Kolkata" required /></Field>
                  <Field label="Interviewer name"><input name="interviewerName" required placeholder="Hiring manager" /></Field>
                  <Field label="Meeting link or location" wide><input name="meetingLink" placeholder="Video link or office location" /></Field>
                  <Field label="Candidate instructions" wide><textarea name="instructions" rows="3" /></Field>
                  <div className="recruitment-form-actions wide"><button className="recruitment-primary-btn">Schedule interview</button></div>
                </form>
              </section>
              <section className="recruitment-panel">
                <div className="recruitment-panel-heading"><div><span className="recruitment-eyebrow">UPCOMING</span><h2>Interview calendar</h2></div></div>
                <div className="recruitment-list">
                  {interviews.length ? interviews.map((item) => (
                    <article className="recruitment-job-card" key={item._id}>
                      <div className="recruitment-card-title"><h3>{item.applicationId?.candidateId?.fullName || "Candidate"} · {item.round}</h3><StatusBadge value={item.status} /></div>
                      <p>{item.applicationId?.jobId?.title || "Job"} · {dateLabel(item.startsAt)}</p>
                      <p className="recruitment-hint">{item.mode} · {item.timeZone}</p>
                    </article>
                  )) : <Empty>No interviews have been scheduled.</Empty>}
                </div>
              </section>
            </div>

            <div className="recruitment-columns">
              <section className="recruitment-panel">
                <div className="recruitment-panel-heading"><div><span className="recruitment-eyebrow">STRUCTURED ASSESSMENT</span><h2>AI interview invitations</h2></div><span className="recruitment-hint">Secure link sent by email only</span></div>
                <p className="recruitment-note">Only applications with completed screening are eligible. AI reports support human review and never make a hiring decision.</p>
                <form className="recruitment-form-grid" onSubmit={sendAIInvitation}>
                  <Field label="Eligible application" wide><select name="applicationId" required defaultValue=""><option value="">{eligibleApplications.length ? "Choose a screened application" : "No eligible screened applications"}</option>{eligibleApplications.map((item) => <option key={item._id} value={item._id}>{item.candidateId?.fullName || "Candidate"} — {item.job?.title || "Job"}</option>)}</select></Field>
                  <Field label="Question template" wide><select name="templateKey" required defaultValue=""><option value="">Choose template</option>{templates.map((item) => <option key={item.key} value={item.key}>{item.name} · {item.questionCount} questions</option>)}</select></Field>
                  <div className="recruitment-form-actions wide"><button className="recruitment-primary-btn" disabled={!eligibleApplications.length || !templates.length}>Send AI interview invitation</button></div>
                </form>
              </section>
              <section className="recruitment-panel">
                <div className="recruitment-panel-heading"><div><span className="recruitment-eyebrow">ASSESSMENT STATUS</span><h2>AI interview activity</h2></div></div>
                <div className="recruitment-list">
                  {invitations.length ? invitations.map((invitation) => {
                    const status = invitation.emailStatus === "failed" ? "email failed" : invitation.status?.replaceAll("_", " ") || "invited";
                    const closed = ["rejected", "not_selected", "hired"].includes(invitation.application?.status);
                    return (
                      <article className="recruitment-job-card" key={invitation.id}>
                        <div className="recruitment-card-title"><h3>{invitation.application?.candidateId?.fullName || "Candidate"} · {invitation.job?.title || "Job"}</h3><StatusBadge value={status} /></div>
                        <p>{invitation.application?.candidateId?.email || "Candidate email unavailable"}{invitation.expiresAt ? ` · Expires ${dateLabel(invitation.expiresAt, { dateStyle: "medium" })}` : ""}</p>
                        <div className="recruitment-actions">
                          {["invited", "email_failed", "started", "expired"].includes(invitation.status) && !closed && <button className="recruitment-secondary-btn small" onClick={() => invitationAction(invitation, "resend")}>Resend / renew link</button>}
                          {["invited", "email_failed", "started"].includes(invitation.status) && <button className="recruitment-danger-btn small" onClick={() => invitationAction(invitation, "revoke")}>Revoke</button>}
                          {invitation.status === "completed" && <button className="recruitment-primary-btn small" onClick={() => invitationAction(invitation, "report")}>View interview review</button>}
                        </div>
                        {invitation.reportData && <AIReport invitation={invitation} onReview={submitAIReview} onIntegrityReview={reviewIntegrityEvent} />}
                      </article>
                    );
                  }) : <Empty>No AI interview invitations yet.</Empty>}
                </div>
              </section>
            </div>
          </section>
        )}

        {activeTab === "Emails" && (
          <section className="recruitment-view recruitment-columns">
            <section className="recruitment-panel">
              <div className="recruitment-panel-heading"><div><span className="recruitment-eyebrow">CANDIDATE COMMUNICATION</span><h2>Email composer</h2></div><span className={emailConfigured ? "recruitment-email-ready" : "recruitment-hint"}>{emailConfigured ? "SMTP delivery enabled" : "SMTP not configured — preview available"}</span></div>
              <form className="recruitment-form-grid" onSubmit={sendEmail}>
                <Field label="Application" wide><select value={emailForm.applicationId} onChange={(event) => setEmailForm((current) => ({ ...current, applicationId: event.target.value }))} required><option value="">Choose an applicant</option>{applications.filter((item) => item.candidateId?.email).map((item) => <option key={item._id} value={item._id}>{item.candidateId.fullName} — {item.jobId?.title || "Job"}</option>)}</select></Field>
                <Field label="Template"><select value={emailForm.templateKey} onChange={(event) => updateEmailTemplate(event.target.value)} required><option value="">Choose template</option>{emailTemplates.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></Field>
                <Field label="Company name"><input value={emailForm.companyName} onChange={(event) => setEmailForm((current) => ({ ...current, companyName: event.target.value }))} /></Field>
                <Field label="Subject" wide><input value={emailForm.subject} onChange={(event) => setEmailForm((current) => ({ ...current, subject: event.target.value }))} /></Field>
                <Field label="Message" wide><textarea rows="8" value={emailForm.body} onChange={(event) => setEmailForm((current) => ({ ...current, body: event.target.value }))} /></Field>
                <div className="recruitment-form-actions wide"><button className="recruitment-secondary-btn" type="button" onClick={previewEmail}>Preview</button><button className="recruitment-primary-btn">Confirm &amp; send</button></div>
              </form>
              {emailPreview && <div className="recruitment-email-preview"><strong>Preview · To: {emailPreview.recipient}</strong><h3>{emailPreview.subject}</h3><pre>{emailPreview.text}</pre>{!emailPreview.configured && <p>Email delivery is not configured. The email cannot be sent yet.</p>}</div>}
            </section>
            <section className="recruitment-panel">
              <div className="recruitment-panel-heading"><div><span className="recruitment-eyebrow">DELIVERY LOG</span><h2>Email activity</h2></div></div>
              <div className="recruitment-list">
                {emailLogs.length ? emailLogs.map((item) => (
                  <article className="recruitment-job-card" key={item._id}>
                    <div className="recruitment-card-title"><h3>{item.candidateId?.fullName || item.recipient}</h3><StatusBadge value={item.status} /></div>
                    <p>{item.applicationId?.jobId?.title || "Recruitment email"} · {String(item.templateKey).replaceAll("_", " ")}</p>
                    <p className="recruitment-hint">{dateLabel(item.createdAt)}</p>
                  </article>
                )) : <Empty>No recruitment email attempts recorded.</Empty>}
              </div>
            </section>
          </section>
        )}
      </main>
    </div>
  );
}

function AIReport({ invitation, onReview, onIntegrityReview }) {
  const data = invitation.reportData;
  const report = data.report || {};
  const questions = data.session?.questions || [];
  const answers = data.session?.answers || [];
  const questionById = new Map(questions.map((item) => [item.id, item]));
  return (
    <section className="recruitment-ai-report">
      <div className="recruitment-ai-report-heading"><div><strong>AI interview review</strong><p>{data.job?.title || "Role"} · {Math.round(Number(report.confidence || 0) * 100)}% evaluation confidence</p></div><span className="recruitment-score">{report.score ?? "—"}<small>/100</small></span></div>
      <p className="recruitment-note">Decision support only. Review answer evidence; the score is not a hiring decision. Integrity signals are separate and do not affect score.</p>
      {(report.warnings || []).map((warning, index) => <p className="recruitment-note" key={index}>{warning}</p>)}
      <details className="recruitment-details"><summary>Review candidate responses and evidence ({answers.length})</summary>
        {answers.length ? answers.map((answer, index) => {
          const question = questionById.get(answer.questionId);
          const evaluation = answer.evaluation || {};
          return <article className="recruitment-answer" key={answer.questionId || index}>
            <strong>{answer.kind === "follow_up" ? "Bounded follow-up" : "Question"}</strong>
            <h4>{answer.questionPrompt || question?.prompt || "Interview question"}</h4>
            <p className="recruitment-answer-text">{answer.text}</p>
            <p>{evaluation.explanation || "No validated evaluation available."}{evaluation.reviewRequired ? " · Human review recommended" : ""}</p>
            <ul>{(evaluation.criteria || []).map((criterion, criterionIndex) => <li key={criterionIndex}><strong>{criterion.label}:</strong> {criterion.score}/4 · {criterion.rationale}{criterion.evidence && <blockquote>{criterion.evidence}</blockquote>}</li>)}</ul>
            {[...(evaluation.missingConcepts || []), ...(evaluation.factualErrors || [])].map((entry, entryIndex) => <p key={entryIndex}>{entry}</p>)}
          </article>;
        }) : <Empty>No evaluated answers are available.</Empty>}
      </details>
      <details className="recruitment-details"><summary>Technical integrity signals</summary>
        {(data.integrityEvents || []).length ? data.integrityEvents.map((event) => <div className="recruitment-integrity-event" key={event._id}>
          <span>{event.type.replaceAll("_", " ")} · {dateLabel(event.occurredAt)} · {event.reviewStatus}</span>
          {event.reviewStatus === "unreviewed" && <button className="recruitment-secondary-btn small" onClick={() => onIntegrityReview(invitation, event._id)}>Mark reviewed</button>}
        </div>) : <p className="recruitment-hint">No technical integrity signals recorded.</p>}
        <p className="recruitment-hint">Browser focus and connection alerts are imperfect signals, not proof of misconduct.</p>
      </details>
      <form className="recruitment-review-form" onSubmit={(event) => onReview(event, invitation.id)}>
        <Field label="Recruiter review"><select name="decision" defaultValue="needs_human_review"><option value="needs_human_review">Needs human review</option><option value="progress_to_next_stage">Progress to next stage</option><option value="do_not_progress">Do not progress</option></select></Field>
        <Field label="Internal note"><textarea name="note" rows="2" maxLength="1000" placeholder="Optional reviewer note" /></Field>
        <button className="recruitment-primary-btn small">Save review</button>
      </form>
      {(report.reviewHistory || []).map((entry, index) => <p className="recruitment-hint" key={index}>{entry.decision.replaceAll("_", " ")} · {entry.actor?.name || "Recruiter"} · {dateLabel(entry.at)}{entry.note ? ` — ${entry.note}` : ""}</p>)}
    </section>
  );
}
