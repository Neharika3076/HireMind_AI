import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "./JobOpenings.css";

const API_BASE = import.meta.env.VITE_RECRUITMENT_API_BASE ||
  (["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)
    ? "http://127.0.0.1:3001/api/recruitment"
    : "/api/recruitment");

export default function JobOpenings() {
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Search & filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  // Application modal state
  const [applyModalJob, setApplyModalJob] = useState(null);
  const [applyForm, setApplyForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    location: "",
    address: "",
    note: "",
    resume: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [applySuccess, setApplySuccess] = useState("");

  // Candidate history state
  const [showHistory, setShowHistory] = useState(false);
  const [historyEmail, setHistoryEmail] = useState("");
  const [historyPassword, setHistoryPassword] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyList, setHistoryList] = useState(null);

  // Fetch jobs
  useEffect(() => {
    async function fetchJobs() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${API_BASE}/public/jobs`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load job openings");
        const items = data.items || [];
        setJobs(items);

        // Check if URL has ?jobId=...
        const targetJobId = searchParams.get("jobId");
        if (targetJobId) {
          const match = items.find((j) => j.id === targetJobId || j._id === targetJobId);
          if (match) setApplyModalJob(match);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, [searchParams]);

  // Unique departments and employment types for filter dropdowns
  const departments = useMemo(() => {
    const set = new Set(jobs.map((j) => j.department).filter(Boolean));
    return Array.from(set);
  }, [jobs]);

  const employmentTypes = useMemo(() => {
    const set = new Set(jobs.map((j) => j.employmentType).filter(Boolean));
    return Array.from(set);
  }, [jobs]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchSearch =
        !searchTerm ||
        job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = selectedDept === "all" || job.department === selectedDept;
      const matchType = selectedType === "all" || job.employmentType === selectedType;
      return matchSearch && matchDept && matchType;
    });
  }, [jobs, searchTerm, selectedDept, selectedType]);

  // Open Apply modal
  const handleOpenApply = (job) => {
    setApplyModalJob(job);
    setApplyError("");
    setApplySuccess("");
    setApplyForm({
      fullName: "",
      email: "",
      password: "",
      phone: "",
      location: "",
      address: "",
      note: "",
      resume: null,
    });
  };

  // Submit Application
  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    if (!applyForm.resume) {
      setApplyError("Please select and upload your resume (PDF or DOCX).");
      return;
    }
    try {
      setSubmitting(true);
      setApplyError("");
      const formData = new FormData();
      formData.append("fullName", applyForm.fullName);
      formData.append("email", applyForm.email);
      formData.append("password", applyForm.password);
      formData.append("phone", applyForm.phone);
      formData.append("location", applyForm.location);
      formData.append("address", applyForm.address);
      formData.append("note", applyForm.note);
      formData.append("resume", applyForm.resume);

      const res = await fetch(`${API_BASE}/public/jobs/${applyModalJob.id || applyModalJob._id}/applications`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit application");

      setApplySuccess(
        `Application received! Your resume for "${applyModalJob.title}" has been submitted. Use your email and password to track application status anytime.`
      );
    } catch (err) {
      setApplyError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch Candidate History
  const handleFetchHistory = async (e) => {
    e.preventDefault();
    try {
      setHistoryLoading(true);
      setHistoryError("");
      const res = await fetch(`${API_BASE}/public/candidate/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: historyEmail, password: historyPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to retrieve applications");
      setHistoryList(data.items || []);
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="jobs-page-shell">
      {/* Header */}
      <header className="jobs-header">
        <Link to="/" className="jobs-logo">
          <span>Krew Careers</span>
          <span className="badge">Open Roles</span>
        </Link>
        <div className="jobs-nav-actions">
          <button
            type="button"
            className="btn-history-toggle"
            onClick={() => setShowHistory((prev) => !prev)}
          >
            {showHistory ? "Hide Applications" : "Check My Applications"}
          </button>
          <Link to="/" className="back-home-link">
            ← Back to Home
          </Link>
        </div>
      </header>

      <main className="jobs-main-content">
        {/* Hero Section */}
        <div className="jobs-hero">
          <div className="jobs-eyebrow">Build what is next</div>
          <h1 className="jobs-hero-title">Open roles for curious builders.</h1>
          <p className="jobs-hero-sub">
            Explore current opportunities across verified organizations hiring on the Krew platform.
          </p>
        </div>

        {/* Candidate History Section */}
        {showHistory && (
          <div className="candidate-history-panel">
            <h3>Previously applied?</h3>
            <p>
              Enter the email and application password you provided when submitting to view your active applications and interview status.
            </p>
            <form className="history-auth-form" onSubmit={handleFetchHistory}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={historyEmail}
                  onChange={(e) => setHistoryEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={historyPassword}
                  onChange={(e) => setHistoryPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary-action" disabled={historyLoading}>
                {historyLoading ? "Checking..." : "Sign In & View"}
              </button>
            </form>

            {historyError && (
              <div className="alert-message error" style={{ marginTop: "16px" }}>
                {historyError}
              </div>
            )}

            {historyList !== null && (
              <div className="history-results-list">
                {historyList.length === 0 ? (
                  <p style={{ margin: "16px 0 0", color: "#9bb0c6" }}>
                    No applications found with these credentials.
                  </p>
                ) : (
                  historyList.map((app) => (
                    <div key={app._id || app.id} className="history-item-card">
                      <div>
                        <h4>{app.jobTitle || app.title}</h4>
                        <div className="meta">
                          {app.companyName} · Applied on{" "}
                          {new Date(app.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <span className="status-tag">
                          {String(app.status || "Applied").replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="jobs-controls-bar">
          <input
            type="text"
            className="jobs-search-input"
            placeholder="Search by job title, keyword, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {departments.length > 0 && (
            <select
              className="jobs-filter-select"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          )}

          {employmentTypes.length > 0 && (
            <select
              className="jobs-filter-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="all">All Types</option>
              {employmentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Content list */}
        {loading && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#31d1bd" }}>
            Loading available job openings...
          </div>
        )}

        {error && (
          <div className="alert-message error">
            {error}. Make sure the recruitment server is running on port 3001.
          </div>
        )}

        {!loading && !error && filteredJobs.length === 0 && (
          <div style={{ textAlign: "center", padding: "64px 0", color: "#8aa2b9" }}>
            <h3>No open positions matching your criteria</h3>
            <p style={{ marginTop: "8px" }}>Try clearing your filters or search terms.</p>
          </div>
        )}

        {/* Jobs Grid */}
        <div className="jobs-grid">
          {filteredJobs.map((job) => {
            const tags = [
              job.department,
              job.workArrangement,
              job.employmentType,
              job.location,
              job.minimumExperience ? `${job.minimumExperience}+ years exp` : null,
              job.openings ? `${job.openings} opening${job.openings > 1 ? "s" : ""}` : null,
            ].filter(Boolean);

            return (
              <article key={job.id || job._id} className="job-card">
                <div>
                  <div className="job-card-header">
                    <span className="job-company-tag">{job.companyName}</span>
                    <h2 className="job-title">{job.title}</h2>
                  </div>

                  <p className="job-snippet">
                    {job.description?.length > 280
                      ? job.description.slice(0, 277) + "…"
                      : job.description}
                  </p>

                  <div className="job-tags-row">
                    {tags.map((t, idx) => (
                      <span key={idx} className="job-tag">
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Expandable Details */}
                  <details className="job-full-details">
                    <summary>View full role details</summary>
                    <p style={{ color: "#c8d8e9", fontSize: "14px", lineHeight: "1.6" }}>
                      {job.description}
                    </p>

                    {job.responsibilities?.length > 0 && (
                      <>
                        <h5>Key Responsibilities</h5>
                        <ul>
                          {job.responsibilities.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </>
                    )}

                    {job.requiredSkills?.length > 0 && (
                      <>
                        <h5>Required Skills & Qualifications</h5>
                        <ul>
                          {job.requiredSkills.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </>
                    )}

                    {job.educationRequirements?.length > 0 && (
                      <>
                        <h5>Education Requirements</h5>
                        <ul>
                          {job.educationRequirements.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      </>
                    )}

                    {job.certifications?.length > 0 && (
                      <>
                        <h5>Certifications</h5>
                        <ul>
                          {job.certifications.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </details>
                </div>

                <div className="job-card-actions">
                  <span className="job-deadline-text">
                    {job.applicationDeadline
                      ? `Apply by ${new Date(job.applicationDeadline).toLocaleDateString()}`
                      : "Immediate opening"}
                  </span>
                  <button
                    type="button"
                    className="btn-primary-action"
                    onClick={() => handleOpenApply(job)}
                  >
                    Apply Now →
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </main>

      {/* Application Modal */}
      {applyModalJob && (
        <div className="modal-backdrop" onClick={() => !submitting && setApplyModalJob(null)}>
          <div className="apply-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Apply for {applyModalJob.title}</h3>
                <p>{applyModalJob.companyName} · {applyModalJob.department}</p>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                disabled={submitting}
                onClick={() => setApplyModalJob(null)}
              >
                ✕
              </button>
            </div>

            {applySuccess ? (
              <div>
                <div className="alert-message success">{applySuccess}</div>
                <div style={{ marginTop: "24px", textAlign: "right" }}>
                  <button
                    type="button"
                    className="btn-primary-action"
                    onClick={() => setApplyModalJob(null)}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitApplication}>
                {applyError && <div className="alert-message error">{applyError}</div>}

                <div className="apply-form-grid">
                  <div className="apply-field">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={applyForm.fullName}
                      onChange={(e) =>
                        setApplyForm({ ...applyForm, fullName: e.target.value })
                      }
                    />
                  </div>

                  <div className="apply-field">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="jane@example.com"
                      value={applyForm.email}
                      onChange={(e) =>
                        setApplyForm({ ...applyForm, email: e.target.value })
                      }
                    />
                  </div>

                  <div className="apply-field">
                    <label>Tracking Password (min 8 chars) *</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      placeholder="Create a password"
                      value={applyForm.password}
                      onChange={(e) =>
                        setApplyForm({ ...applyForm, password: e.target.value })
                      }
                    />
                  </div>

                  <div className="apply-field">
                    <label>Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+1 (555) 000-0000"
                      value={applyForm.phone}
                      onChange={(e) =>
                        setApplyForm({ ...applyForm, phone: e.target.value })
                      }
                    />
                  </div>

                  <div className="apply-field">
                    <label>City & Country *</label>
                    <input
                      type="text"
                      required
                      placeholder="San Francisco, USA"
                      value={applyForm.location}
                      onChange={(e) =>
                        setApplyForm({ ...applyForm, location: e.target.value })
                      }
                    />
                  </div>

                  <div className="apply-field">
                    <label>Street Address *</label>
                    <input
                      type="text"
                      required
                      placeholder="123 Market St, Suite 400"
                      value={applyForm.address}
                      onChange={(e) =>
                        setApplyForm({ ...applyForm, address: e.target.value })
                      }
                    />
                  </div>

                  <div className="apply-field full-span">
                    <label>Resume (PDF or DOCX, max 5MB) *</label>
                    <div className="file-dropzone">
                      <input
                        type="file"
                        required
                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setApplyForm({ ...applyForm, resume: e.target.files[0] });
                          }
                        }}
                      />
                      {applyForm.resume ? (
                        <div style={{ color: "#31d1bd", fontWeight: 700 }}>
                          📄 Selected: {applyForm.resume.name} (
                          {(applyForm.resume.size / 1024 / 1024).toFixed(2)} MB)
                        </div>
                      ) : (
                        <div>
                          <strong>Drop your resume here or click to browse</strong>
                          <div style={{ color: "#7f98af", fontSize: "12px", marginTop: "4px" }}>
                            Supports PDF or DOCX up to 5 MB
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="apply-field full-span">
                    <label>Short Note (Optional)</label>
                    <textarea
                      rows={3}
                      placeholder="Tell us what excites you about this role..."
                      value={applyForm.note}
                      onChange={(e) =>
                        setApplyForm({ ...applyForm, note: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    disabled={submitting}
                    onClick={() => setApplyModalJob(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary-action"
                    disabled={submitting}
                  >
                    {submitting ? "Submitting Application..." : "Submit Application"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
