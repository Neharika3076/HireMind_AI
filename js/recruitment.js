"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const storeApi = window.TerraHireStore;
  const user = storeApi?.getCurrentUser?.();
  if (!user) return;
  // The EMS is often opened through VS Code Live Server during development.
  // Relative API URLs then hit Live Server (which returns 404/405), so route
  // local pages directly to the Express service. Deployments can override this.
  const localHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  const apiBase = window.HIREMIND_RECRUITMENT_API || (localHost || window.location.protocol === "file:"
    ? "http://127.0.0.1:3001/api/recruitment"
    : "/api/recruitment");
  const state = { jobs: [], applications: [], emailTemplates: [], editingJobId: null, screeningJobId: "" };
  const canManageJobs = ["admin", "executive"].includes(String(user.roleType || "").toLowerCase());
  const canDeleteJobs = String(user.roleType || "").toLowerCase() === "admin";
  const $ = (selector) => document.querySelector(selector);
  const text = (value) => String(value ?? "").replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[character]);
  const organizationId = user.orgId || user.organizationId || user.orgCode || "";
  const localOrganizations = storeApi?.getStore?.()?.organizations || [];
  const currentOrganization = localOrganizations.find((organization) => organization.id === organizationId || organization.code === organizationId);
  if (currentOrganization && document.querySelector('#job-form [name="companyName"]')) document.querySelector('#job-form [name="companyName"]').value = currentOrganization.name || "";

  function notify(message, error = false) { const node = $("#recruitment-message"); node.textContent = message; node.hidden = false; node.classList.toggle("error", error); window.clearTimeout(notify.timer); notify.timer = window.setTimeout(() => { node.hidden = true; }, 6500); }
  function headers(json = true) { const result = { "x-ems-user-id": user.id || "", "x-ems-user-name": user.fullName || "", "x-ems-user-role": String(user.roleType || "").toLowerCase(), "x-ems-organization-id": organizationId }; if (json) result["Content-Type"] = "application/json"; return result; }
  async function request(path, options = {}) { const url = `${apiBase}${path}`; let response; try { response = await fetch(url, { ...options, headers: { ...headers(!(options.body instanceof FormData)), ...(options.headers || {}) } }); } catch (_error) { throw new Error(`Could not reach the recruitment server at ${apiBase}. Start it with npm run dev in recruitment-server.`); } const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || `Recruitment API returned ${response.status} for ${options.method || "GET"} ${url}.`); return payload; }
  function empty(label) { return `<div class="empty">${text(label)}</div>`; }
  function listToArray(value) { return String(value || "").split(/[,\n]/).map((entry) => entry.trim()).filter(Boolean); }
  function statusBadge(value) { return `<span class="badge">${text(value || "draft")}</span>`; }

  function changeView(view) { document.querySelectorAll(".recruitment-tabs button").forEach((button) => button.classList.toggle("active", button.dataset.view === view)); document.querySelectorAll(".recruitment-view").forEach((section) => { section.hidden = section.id !== `view-${view}`; }); if (view === "jobs") loadJobs(); if (view === "screening") loadScreening(); if (view === "candidates") loadCandidates(); if (view === "interviews") loadInterviews(); if (view === "emails") loadEmails(); }
  document.querySelectorAll(".recruitment-tabs button").forEach((button) => button.addEventListener("click", () => changeView(button.dataset.view)));

  async function loadOverview() { try { const data = await request("/dashboard"); const labels = { activeJobs: "Active jobs", totalCandidates: "Candidates", newApplications: "New applications · 7 days", awaitingReview: "Awaiting review", scheduledInterviews: "Scheduled interviews", completedInterviews: "Completed interviews", offers: "Offers" }; $("#metrics-grid").innerHTML = Object.entries(labels).map(([key, label]) => `<article class="metric"><span>${label}</span><strong>${data.metrics[key] || 0}</strong></article>`).join(""); $("#activity-list").innerHTML = data.recentActivity.length ? data.recentActivity.map((item) => `<div class="activity-row"><span><strong>${text(item.actor?.name || "A recruiter")}</strong> ${text(item.action)}${item.metadata?.title ? ` · ${text(item.metadata.title)}` : ""}</span><time>${new Date(item.createdAt).toLocaleString()}</time></div>`).join("") : empty("No recruitment activity yet."); } catch (error) { notify(error.message, true); } }
  async function loadJobs() {
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      const status = $("#jobs-status-filter").value;
      const search = $("#jobs-search").value.trim();
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      const data = await request(`/jobs${params.size ? `?${params}` : ""}`);
      state.jobs = data.items;
      $("#job-editor-panel").hidden = !canManageJobs;
      $("#jobs-list").innerHTML = data.items.length ? data.items.map((job) => `<article class="job-card"><div style="display:flex;justify-content:space-between;gap:8px"><h3>${text(job.title)}</h3>${statusBadge(job.status)}</div><p class="hint">Job ID: ${text(job._id)}</p><p>${text(job.companyName)} · ${text(job.department)} · ${text(job.employmentType)} · ${job.openings} opening${job.openings === 1 ? "" : "s"}${job.applicationDeadline ? ` · closes ${new Date(job.applicationDeadline).toLocaleDateString()}` : ""}</p><p>${job.metrics.applicants} applicants · ${job.metrics.screened} screened${job.aiJobProfile ? " · AI profile available" : ""}</p><div class="item-actions"><button class="tiny-btn primary" data-screen-job="${job._id}">View applicants</button>${canManageJobs && job.status === "draft" ? `<button class="tiny-btn" data-publish-job="${job._id}">Publish</button>` : ""}${canManageJobs && job.status === "published" ? `<button class="tiny-btn" data-close-job="${job._id}">Close</button>` : ""}${canManageJobs && job.status === "closed" ? `<button class="tiny-btn" data-archive-job="${job._id}">Archive</button>` : ""}${canManageJobs ? `<button class="tiny-btn" data-edit-job="${job._id}">Edit</button><button class="tiny-btn" data-analyze-job="${job._id}">Analyze job</button>` : ""}${canDeleteJobs ? `<button class="tiny-btn danger" data-delete-job="${job._id}">Delete permanently</button>` : ""}</div></article>`).join("") : empty("Create your first job opening to begin recruiting.");
      data.items.forEach((job) => {
        const cardButton = $("#jobs-list").querySelector('[data-screen-job="' + CSS.escape(String(job._id)) + '"]');
        const card = cardButton?.closest(".job-card");
        if (!card) return;
        cardButton.textContent = "View applicants";
      });
    } catch (error) { notify(error.message, true); }
  }
  $("#jobs-list").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-delete-job]");
    if (!button || !canDeleteJobs) return;
    event.stopPropagation();
    if (!window.confirm("Permanently delete this job and its applications, screening results, interviews, and job-specific resumes? Candidate profiles and unrelated applications will remain. This cannot be undone.")) return;
    button.disabled = true;
    try {
      await request(`/jobs/${button.dataset.deleteJob}`, { method: "DELETE" });
      notify("Job-specific recruitment records were permanently deleted. Candidate profiles and unrelated applications were retained.");
      await loadJobs();
      loadOverview();
    } catch (error) { notify(error.message, true); button.disabled = false; }
  });
  $("#jobs-status-filter").addEventListener("change", loadJobs);
  $("#jobs-list").addEventListener("click", (event) => { const button = event.target.closest("[data-screen-job]"); if (button) state.screeningJobId = button.dataset.screenJob; }, true);
  let jobSearchTimer; $("#jobs-search").addEventListener("input", () => { clearTimeout(jobSearchTimer); jobSearchTimer = window.setTimeout(loadJobs, 250); });
  $("#jobs-list").addEventListener("click", async (event) => { const button = event.target.closest("button"); if (!button) return; try { if (button.dataset.screenJob) { changeView("screening"); window.setTimeout(() => { $("#screening-job").value = button.dataset.screenJob; loadScreeningResults(); }, 0); return; } if (button.dataset.editJob) { const job = state.jobs.find((item) => item._id === button.dataset.editJob); if (!job) return; state.editingJobId = job._id; const form = $("#job-form"); ["title", "department", "employmentType", "workArrangement", "location", "hiringManagerName", "openings", "applicationDeadline", "minimumExperience", "preferredExperience", "description"].forEach((key) => { if (form.elements[key]) form.elements[key].value = key === "applicationDeadline" && job[key] ? new Date(job[key]).toISOString().slice(0, 10) : (job[key] ?? ""); }); form.elements.requiredSkills.value = (job.requiredSkills || []).join(", "); form.elements.preferredSkills.value = (job.preferredSkills || []).join(", "); form.elements.educationRequirements.value = (job.educationRequirements || []).join(", "); form.elements.certifications.value = (job.certifications || []).join(", "); form.elements.responsibilities.value = (job.responsibilities || []).join("\n"); $("#job-form-title").textContent = `Edit: ${job.title}`; window.scrollTo({ top: 0, behavior: "smooth" }); return; } const action = button.dataset.publishJob ? "publish" : button.dataset.closeJob ? "close" : button.dataset.archiveJob ? "archive" : button.dataset.analyzeJob ? "analyze" : ""; const id = button.dataset.publishJob || button.dataset.closeJob || button.dataset.archiveJob || button.dataset.analyzeJob; if (!action) return; button.disabled = true; const outcome = await request(`/jobs/${id}/${action}`, { method: "POST" }); if (action === "analyze") { const profile = outcome.profile || {}; notify(`Job analyzed. AI found ${profile.skills?.length || 0} skill requirement(s); edit the job fields if you need to correct them.`); } else notify(`Job ${action}ed.`); await loadJobs(); } catch (error) { notify(error.message, true); } });
  $("#job-form").addEventListener("submit", async (event) => { event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); const body = Object.fromEntries(form.entries()); body.openings = Number(body.openings); body.minimumExperience = Number(body.minimumExperience); body.preferredExperience = Number(body.preferredExperience); ["requiredSkills", "preferredSkills", "responsibilities", "educationRequirements", "certifications"].forEach((key) => { body[key] = listToArray(body[key]); }); try { const editing = state.editingJobId; await request(editing ? `/jobs/${editing}` : "/jobs", { method: editing ? "PATCH" : "POST", body: JSON.stringify(body) }); formElement.reset(); state.editingJobId = null; $("#job-form-title").textContent = "Create a job"; notify(editing ? "Job updated. Publish or re-analyze it when ready." : "Job saved as a draft. Publish it when the description is ready."); await loadJobs(); loadOverview(); } catch (error) { notify(error.message, true); } });
  $("#job-form-reset").addEventListener("click", () => { $("#job-form").reset(); state.editingJobId = null; $("#job-form-title").textContent = "Create a job"; });

  function renderJobChoices() { const previous = $("#screening-job").value || state.screeningJobId; const options = state.jobs.map((job) => `<option value="${job._id}">${text(job.title)} — ${text(job.department)} (${job.status})</option>`).join(""); $("#screening-job").innerHTML = `<option value="">Choose a job</option>${options}`; if (state.jobs.some((job) => String(job._id) === String(previous))) $("#screening-job").value = previous; }
  async function loadScreening() { if (!state.jobs.length) await loadJobs(); renderJobChoices(); await loadScreeningResults(); }
  function analysisList(items, fallback) { return Array.isArray(items) && items.length ? items.map((item) => `<li>${text(typeof item === "string" ? item : item.skill || item.name || JSON.stringify(item))}</li>`).join("") : `<li>${text(fallback)}</li>`; }
  function screeningMarkup(item) {
    const result = item.screeningResult || {};
    const skills = result.skill_analysis || {};
    const experience = result.experience_analysis || {};
    const education = result.education_analysis || {};
    const completed = item.screeningStatus === "completed";
    const status = item.status || "awaiting_review";
    const canDecide = !["approved", "shortlisted", "rejected", "not_selected"].includes(status);
    const actions = '<div class="item-actions">' + (item.resumeAvailable ? '<button class="tiny-btn" data-resume="' + text(item._id) + '">Download resume</button>' : "") +
      (["failed", "pending"].includes(item.screeningStatus) && item.resumeAvailable ? '<button class="tiny-btn" data-retry="' + text(item._id) + '">Retry screening</button>' : "") +
      (canDecide ? '<button class="tiny-btn primary" data-review="' + text(item._id) + '" data-status="approved">Approve</button><button class="tiny-btn" data-review="' + text(item._id) + '" data-status="shortlisted">Shortlist</button><button class="tiny-btn danger" data-review="' + text(item._id) + '" data-status="rejected">Reject</button>' : "") + '</div>';
    const evaluation = completed
      ? '<p><span class="score">' + text(result.overall_score ?? "—") + '</span> ATS score <span class="ai-disclaimer">Decision support only — recruiter review required.</span></p>' +
        (result.score_note ? '<p class="hint">' + text(result.score_note) + '</p>' : "") +
        '<div class="analysis-grid"><div><b>Matched skills</b><ul>' + analysisList([...(skills.matched_required || []), ...(skills.matched_preferred || [])], "No matching skills identified") + '</ul></div><div><b>Gaps to review</b><ul>' + analysisList(result.gaps || result.critical_gaps, "No gaps identified") + '</ul></div><div><b>Experience</b><p>' + text(experience.reason || "Not analyzed") + '</p></div><div><b>Education</b><p>' + text(education.reason || "Not analyzed") + '</p></div></div>'
      : '<p>' + text(item.screeningFailure || (item.screeningStatus === "pending" ? "Screening is waiting to run." : "No screening result is available.")) + '</p>';
    const location = item.candidateId?.location ? " · " + text(item.candidateId.location) : "";
    const email = item.candidateId?.email ? '<p>' + text(item.candidateId.email) + text(location) + '</p>' : "";
    return '<article class="result-row"><div style="display:flex;justify-content:space-between;gap:12px"><strong>' + text(item.candidateId?.fullName || "Candidate") + '</strong>' + statusBadge(status) + '</div>' +
      '<p>Application ID: ' + text(item._id) + ' · Applied ' + text(item.appliedAt ? new Date(item.appliedAt).toLocaleDateString() : "date unavailable") + ' · Screening: ' + text(item.screeningStatus) + '</p>' + email + evaluation + actions + '</article>';
  }
  async function downloadResume(applicationId) {
    const response = await fetch(apiBase + "/applications/" + encodeURIComponent(applicationId) + "/resume", { headers: headers(false) });
    if (!response.ok) { const error = await response.json().catch(() => ({})); throw new Error(error.error || "Could not download this application's resume."); }
    const blobUrl = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    const disposition = response.headers.get("content-disposition") || "";
    const filename = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    anchor.href = blobUrl; anchor.download = filename ? decodeURIComponent(filename[1]) : "resume"; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }
  async function loadScreeningResults() {
    const jobId = $("#screening-job").value;
    const top = $("#top-candidates"), other = $("#other-applicants"), decided = $("#decided-applicants");
    if (!jobId) { top.innerHTML = empty("Select a job to view applicants."); other.innerHTML = ""; decided.innerHTML = ""; $("#screening-job-heading").textContent = ""; return; }
    try {
      const data = await request("/screening/jobs/" + encodeURIComponent(jobId));
      $("#screening-job-heading").textContent = data.job.title + " · Job ID " + data.job.id + " · " + data.job.companyName + " · " + data.job.department + " · " + data.items.length + " applicant(s)";
      const selectedStatus = $("#screening-status").value;
      const filtered = data.items.filter((item) => !selectedStatus || item.status === selectedStatus);
      const decisions = filtered.filter((item) => ["approved", "shortlisted", "rejected", "not_selected"].includes(item.status));
      const active = filtered.filter((item) => !["approved", "shortlisted", "rejected", "not_selected"].includes(item.status));
      active.sort((a, b) => {
        const valueA = a.screeningResult?.overall_score, valueB = b.screeningResult?.overall_score;
        const scoreA = a.screeningStatus === "completed" && valueA !== null && valueA !== undefined && Number.isFinite(Number(valueA)) ? Number(valueA) : -1;
        const scoreB = b.screeningStatus === "completed" && valueB !== null && valueB !== undefined && Number.isFinite(Number(valueB)) ? Number(valueB) : -1;
        return scoreB - scoreA || new Date(a.appliedAt || 0) - new Date(b.appliedAt || 0);
      });
      const ranked = active.filter((item) => item.screeningStatus === "completed" && item.screeningResult?.overall_score !== null && item.screeningResult?.overall_score !== undefined && Number.isFinite(Number(item.screeningResult.overall_score))).slice(0, 5);
      const topIds = new Set(ranked.map((item) => String(item._id)));
      const remaining = active.filter((item) => !topIds.has(String(item._id)));
      top.innerHTML = ranked.length ? ranked.map(screeningMarkup).join("") : empty("No completed applicant screenings yet.");
      other.innerHTML = remaining.length ? remaining.map(screeningMarkup).join("") : empty("No other active applicants.");
      decided.innerHTML = decisions.length ? decisions.map(screeningMarkup).join("") : empty("No recruiter decisions recorded yet.");
    } catch (error) { notify(error.message, true); }
  }
  $("#screening-job").addEventListener("change", () => { state.screeningJobId = $("#screening-job").value; loadScreeningResults(); });
  $("#screening-status").addEventListener("change", loadScreeningResults);
  document.querySelector("#view-screening").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-review], [data-retry], [data-resume]");
    if (!button) return;
    button.disabled = true;
    try {
      if (button.dataset.resume) await downloadResume(button.dataset.resume);
      if (button.dataset.retry) { await request("/screening/applications/" + encodeURIComponent(button.dataset.retry) + "/retry", { method: "POST" }); notify("Screening completed."); await loadScreeningResults(); }
      if (button.dataset.review) { if (button.dataset.status === "rejected" && !window.confirm("Reject this application? The candidate will leave the active Candidates list unless they have another active application.")) { button.disabled = false; return; } await request("/applications/" + encodeURIComponent(button.dataset.review) + "/status", { method: "PATCH", body: JSON.stringify({ status: button.dataset.status }) }); notify("Application status updated."); await loadScreeningResults(); loadOverview(); if (!document.querySelector("#view-candidates")?.hidden) await loadCandidates(); }
    } catch (error) { notify(error.message, true); if (button.dataset.retry) await loadScreeningResults(); button.disabled = false; }
  });

  async function loadCandidates() { try { const query = $("#candidate-search").value.trim(); const data = await request(`/candidates${query ? `?search=${encodeURIComponent(query)}` : ""}`); $("#candidates-list").innerHTML = data.items.length ? data.items.map((candidate) => `<article class="candidate-row"><strong>${text(candidate.fullName)}</strong><p>${text(candidate.email || "No email")} · ${text(candidate.location || "Location not supplied")}</p><p>${text(candidate.applicationCount || 0)} application(s) in this organization</p><button class="tiny-btn" data-candidate-history="${text(candidate._id)}">View application history</button><div id="candidate-history-${text(candidate._id)}"></div></article>`).join("") : empty("No candidates match this search."); } catch (error) { notify(error.message, true); } }
  $("#candidates-list").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-candidate-history]");
    if (!button) return;
    const target = $("#candidate-history-" + CSS.escape(button.dataset.candidateHistory));
    button.disabled = true;
    try {
      const data = await request("/candidates/" + encodeURIComponent(button.dataset.candidateHistory));
      const screeningByApplication = new Map((data.screening || []).filter((row) => row.applicationId).map((row) => [String(row.applicationId), row]));
      target.innerHTML = data.applications.length ? '<div class="application-history">' + data.applications.map((application) => {
        const screening = screeningByApplication.get(String(application._id));
        const score = screening?.status === "completed" ? " · ATS " + text(screening.result?.overall_score ?? "—") : "";
        return '<p><strong>' + text(application.jobId?.title || "Removed job") + '</strong> · ' + text(application.jobId?.companyName || "Company unavailable") + ' · ' + text(application.jobId?.department || "Department unavailable") + ' · ' + statusBadge(application.status) + ' · ' + text(new Date(application.appliedAt).toLocaleDateString()) + score + '</p>';
      }).join("") + '</div>' : empty("No applications in this organization.");
      button.textContent = "Refresh application history";
    } catch (error) { notify(error.message, true); }
    finally { button.disabled = false; }
  });
  let candidateTimer; $("#candidate-search").addEventListener("input", () => { clearTimeout(candidateTimer); candidateTimer = setTimeout(loadCandidates, 250); });

  async function loadInterviews() { try { const [interviewData, appData] = await Promise.all([request("/interviews"), request("/applications?limit=100")]); state.applications = appData.items; $("#interview-application").innerHTML = `<option value="">Choose an applicant</option>${appData.items.map((item) => `<option value="${item._id}">${text(item.candidateId?.fullName || "Candidate")} — ${text(item.jobId?.title || "Job")}</option>`).join("")}`; $("#interviews-list").innerHTML = interviewData.items.length ? interviewData.items.map((item) => `<article class="interview-card"><strong>${text(item.applicationId?.candidateId?.fullName || "Candidate")} · ${text(item.round)}</strong>${statusBadge(item.status)}<p>${text(item.applicationId?.jobId?.title || "Job")} · ${new Date(item.startsAt).toLocaleString()}</p><p>${text(item.mode)} · ${text(item.timeZone)}</p></article>`).join("") : empty("No interviews have been scheduled."); } catch (error) { notify(error.message, true); } }
  $("#interview-form").addEventListener("submit", async (event) => { event.preventDefault(); const formElement = event.currentTarget; const body = Object.fromEntries(new FormData(formElement).entries()); body.interviewers = [{ id: body.interviewerName.toLowerCase().replace(/\W+/g, "-"), name: body.interviewerName }]; delete body.interviewerName; if (body.mode !== "in_person") { body.meetingLink = body.meetingLink; } else { body.location = body.meetingLink; delete body.meetingLink; } try { await request("/interviews", { method: "POST", body: JSON.stringify(body) }); formElement.reset(); notify("Interview scheduled."); await loadInterviews(); loadOverview(); } catch (error) { notify(error.message, true); } });

  function updateEmailTemplate() { const selected = state.emailTemplates.find((item) => item.key === $("#email-template").value); if (!selected) return; $("#email-subject").value = selected.subject; $("#email-body").value = selected.body; $("#email-preview").hidden = true; }
  async function loadEmails() { try { const [templates, logs, applications] = await Promise.all([request("/emails/templates"), request("/emails/logs"), request("/applications?limit=100")]); state.emailTemplates = templates.templates; const templateSelect = $("#email-template"); const currentTemplate = templateSelect.value; templateSelect.innerHTML = state.emailTemplates.map((item) => `<option value="${item.key}">${text(item.label)}</option>`).join(""); if (state.emailTemplates.some((item) => item.key === currentTemplate)) templateSelect.value = currentTemplate; const applicationSelect = $("#email-application"); const currentApplication = applicationSelect.value; applicationSelect.innerHTML = `<option value="">Choose an applicant</option>${applications.items.filter((item) => item.candidateId?.email).map((item) => `<option value="${item._id}">${text(item.candidateId.fullName)} — ${text(item.jobId?.title || "Job")}</option>`).join("")}`; if (applications.items.some((item) => item._id === currentApplication)) applicationSelect.value = currentApplication; updateEmailTemplate(); const config = $("#email-config-status"); config.textContent = logs.configured ? "SMTP delivery enabled" : "SMTP not configured — preview is available"; config.classList.toggle("email-ready", logs.configured); $("#email-logs").innerHTML = logs.items.length ? logs.items.map((item) => `<article class="email-log-row"><div><strong>${text(item.candidateId?.fullName || item.recipient)}</strong><p>${text(item.applicationId?.jobId?.title || "Recruitment email")} · ${text(item.templateKey.replaceAll("_", " "))}</p></div><div>${statusBadge(item.status)}<p>${new Date(item.createdAt).toLocaleString()}</p></div></article>`).join("") : empty("No recruitment email attempts recorded."); } catch (error) { notify(error.message, true); } }
  $("#email-template").addEventListener("change", updateEmailTemplate);
  async function previewEmail() { const body = Object.fromEntries(new FormData($("#email-form")).entries()); if (!body.applicationId || !body.templateKey) return notify("Choose an application and template before previewing.", true); try { const preview = await request("/emails/preview", { method: "POST", body: JSON.stringify(body) }); $("#email-preview").hidden = false; $("#email-preview").innerHTML = `<strong>Preview · To: ${text(preview.recipient)}</strong><p><b>${text(preview.subject)}</b></p><pre>${text(preview.text)}</pre>${preview.configured ? "" : "<p class=\"email-warning\">SMTP is not configured, so this cannot be sent yet.</p>"}`; } catch (error) { notify(error.message, true); } }
  $("#preview-email").addEventListener("click", previewEmail);
  $("#email-form").addEventListener("submit", async (event) => { event.preventDefault(); const body = Object.fromEntries(new FormData(event.currentTarget).entries()); if (!body.applicationId || !body.templateKey) return notify("Choose an application and template before sending.", true); if (!window.confirm("Send this email to the selected candidate?")) return; body.confirm = true; body.idempotencyKey = crypto.randomUUID(); try { await request("/emails/send", { method: "POST", body: JSON.stringify(body) }); notify("Email sent and recorded."); await loadEmails(); } catch (error) { notify(error.message, true); await loadEmails(); } });

  (async () => { try { const health = await fetch(`${apiBase}/health`).then((response) => response.json()); const badge = $("#service-status"); const ready = health.status === "healthy"; badge.textContent = ready ? "Recruitment service online" : "Recruitment service needs attention"; badge.classList.add(ready ? "ready" : "error"); if (!ready) notify("The recruitment service is running but MongoDB or the AI service needs attention.", true); } catch (_error) { const badge = $("#service-status"); badge.textContent = "Recruitment service offline"; badge.classList.add("error"); notify("Start the recruitment service before using this workspace.", true); } loadOverview(); })();
});
