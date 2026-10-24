import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./PublicJobOpenings.css";

const API_BASE = import.meta.env.VITE_RECRUITMENT_API_BASE ||
  (["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)
    ? "http://127.0.0.1:3001/api/recruitment"
    : "/api/recruitment");

const INTERVIEW_LABELS = {
  not_invited: "No interview invitation yet",
  invited: "Interview invitation sent by email",
  email_failed: "Interview email could not be delivered — contact the hiring team",
  started: "Interview in progress",
  completed: "Interview completed",
  revoked: "Invitation revoked",
  expired: "Invitation expired",
  alternative_requested: "Alternative assessment requested",
  not_available: "Interview no longer available",
};

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw new Error(`Could not reach the recruitment service at ${API_BASE}. Start it and refresh this page.`);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Recruitment API returned ${response.status}.`);
  return payload;
}

function dateLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
}

function JobCard({ job }) {
  const description = String(job.description || "");
  const tags = [
    job.department,
    job.workArrangement,
    job.employmentType,
    job.location,
    job.minimumExperience ? `${job.minimumExperience}+ years` : "",
    `${job.openings || 1} opening${job.openings === 1 ? "" : "s"}`,
    job.applicationDeadline ? `Apply by ${dateLabel(job.applicationDeadline)}` : "",
  ].filter(Boolean);

  return (
    <article className="public-careers-job-card">
      <div>
        <p className="public-careers-company">{job.companyName || "Organization"}</p>
        <h2>{job.title || "Open role"}</h2>
        <p className="public-careers-description">
          {description.length > 420 ? `${description.slice(0, 417)}…` : description}
        </p>
        <div className="public-careers-tags">
          {tags.map((tag, index) => <span className="public-careers-tag" key={`${tag}-${index}`}>{tag}</span>)}
        </div>
        <details className="public-careers-details">
          <summary>View full role details</summary>
          <p>{description}</p>
          {[
            ["Responsibilities", job.responsibilities],
            ["Required skills", job.requiredSkills],
            ["Education", job.educationRequirements],
            ["Certifications", job.certifications],
          ].map(([heading, items]) => Array.isArray(items) && items.length > 0 && (
            <section className="public-careers-detail-section" key={heading}>
              <h3>{heading}</h3>
              <ul>{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
            </section>
          ))}
        </details>
      </div>
      <a className="public-careers-apply" href={`application.html?jobId=${encodeURIComponent(job.id)}`}>Apply now</a>
    </article>
  );
}

export default function PublicJobOpenings() {
  const [jobs, setJobs] = useState([]);
  const [jobsStatus, setJobsStatus] = useState({ loading: true, message: "Loading openings…", error: false });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMessage, setHistoryMessage] = useState("");
  const [historyError, setHistoryError] = useState(false);
  const [history, setHistory] = useState([]);
  const [interviews, setInterviews] = useState([]);

  useEffect(() => {
    let active = true;
    const loadJobs = async () => {
      try {
        const data = await request("/public/jobs");
        if (!active) return;
        const items = Array.isArray(data.items) ? data.items : [];
        setJobs(items);
        setJobsStatus({
          loading: false,
          message: items.length ? "" : "There are no open roles right now. Please check back soon.",
          error: false,
        });
      } catch (error) {
        if (active) setJobsStatus({ loading: false, message: error.message, error: true });
      }
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") loadJobs();
    };

    loadJobs();
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      active = false;
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  const loadApplicationHistory = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const credentials = { email: formData.get("email"), password: formData.get("password") };
    setHistoryLoading(true);
    setHistoryMessage("Loading your applications…");
    setHistoryError(false);
    setHistory([]);
    setInterviews([]);
    try {
      const [applicationsData, interviewData] = await Promise.all([
        request("/public/candidate/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        }),
        request("/public/ai-interviews/candidate/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        }),
      ]);
      const applications = Array.isArray(applicationsData.items) ? applicationsData.items : [];
      setHistory(applications);
      setInterviews(Array.isArray(interviewData.items) ? interviewData.items : []);
      setHistoryMessage(applications.length ? "Your application history" : "No applications were found for this account.");
    } catch (error) {
      setHistoryMessage(error.message);
      setHistoryError(true);
    } finally {
      setHistoryLoading(false);
    }
  };

  const interviewByApplication = new Map(interviews.map((item) => [String(item.applicationId), item]));

  return (
    <div className="public-careers-page">
      <header className="public-careers-header">
        <Link className="public-careers-brand" to="/">HireMind AI <span>Careers</span></Link>
        <Link className="public-careers-back" to="/">Back to home</Link>
      </header>
      <main className="public-careers-main">
        <div className="public-careers-page-top">
          <div>
            <span className="public-careers-eyebrow">Build what is next</span>
            <h1>Open roles for curious builders.</h1>
            <p>Explore current roles from organizations hiring through HireMind.</p>
          </div>
        </div>

        <section className="public-careers-history" aria-labelledby="public-careers-history-title">
          <div className="public-careers-history-heading">
            <div>
              <h2 id="public-careers-history-title">Previously applied?</h2>
              <p>Sign in with the email and password you used when applying to see your applications across companies.</p>
            </div>
            <button
              className="public-careers-history-toggle"
              type="button"
              aria-expanded={historyOpen}
              onClick={() => setHistoryOpen((open) => !open)}
            >
              {historyOpen ? "Hide application sign-in" : "View my applications"}
            </button>
          </div>
          {historyOpen && (
            <form className="public-careers-history-form" onSubmit={loadApplicationHistory}>
              <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
              <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
              <button className="public-careers-apply" type="submit" disabled={historyLoading}>
                {historyLoading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}
          {historyMessage && <p className={`public-careers-history-message${historyError ? " is-error" : ""}`} role={historyError ? "alert" : "status"}>{historyMessage}</p>}
          {history.length > 0 && (
            <div className="public-careers-history-list">
              {history.map((item) => {
                const job = item.job || {};
                const interview = interviewByApplication.get(String(item.applicationId));
                const interviewStatus = interview
                  ? interview.emailStatus === "preview" && ["invited", "started"].includes(interview.status)
                    ? "Interview invitation is not available by email yet"
                    : INTERVIEW_LABELS[interview.status] || String(interview.status).replaceAll("_", " ")
                  : "No interview invitation yet";
                return (
                  <article className="public-careers-history-row" key={item.applicationId}>
                    <div>
                      <strong>{job.title || "Job no longer available"}</strong>
                      <p>{job.companyName || ""}{job.department ? ` · ${job.department}` : ""}</p>
                      <p className="public-careers-interview-status">AI interview: {interviewStatus}</p>
                    </div>
                    <span className="public-careers-history-status">{String(item.status || "pending").replaceAll("_", " ")}</span>
                    <time>{dateLabel(item.appliedAt)}</time>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {jobsStatus.message && (
          <p className={`public-careers-jobs-message${jobsStatus.error ? " is-error" : ""}`} role={jobsStatus.error ? "alert" : "status"} aria-live="polite">
            {jobsStatus.message}
          </p>
        )}
        {jobs.length > 0 && (
          <section className="public-careers-job-grid" aria-label="Published job openings">
            {jobs.map((job) => <JobCard key={job.id} job={job} />)}
          </section>
        )}
      </main>
    </div>
  );
}
