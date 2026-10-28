(function () {
  "use strict";

  var apiBase = window.HIREMIND_RECRUITMENT_API ||
    ((["localhost", "127.0.0.1", "::1"].includes(location.hostname) || location.protocol === "file:")
      ? "http://127.0.0.1:3001/api/recruitment"
      : "/api/recruitment");
  var params = new URLSearchParams(location.search);
  var roleEl = document.getElementById("role-name");
  var form = document.getElementById("application-form");
  var jobId = params.get("jobId");

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>\"]/g, function (character) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[character];
    });
  }

  async function request(path, options) {
    var response = await fetch(apiBase + path, options || {});
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(payload.error || "The recruitment service could not complete this request.");
    return payload;
  }

  var list = document.getElementById("posted-jobs");
  if (list) {
    var message = document.getElementById("jobs-message");
    request("/public/jobs").then(function (data) {
      var jobs = data.items || [];
      if (!jobs.length) {
        message.textContent = "There are no open roles right now. Please check back soon.";
        return;
      }
      message.textContent = "";
      list.innerHTML = jobs.map(function (job) {
        var description = job.description.length > 420 ? job.description.slice(0, 417) + "…" : job.description;
        var tags = [job.department, job.workArrangement, job.employmentType, job.location, job.minimumExperience ? job.minimumExperience + "+ years" : "", job.openings + " opening" + (job.openings === 1 ? "" : "s"), job.applicationDeadline ? "Apply by " + new Date(job.applicationDeadline).toLocaleDateString() : ""]
          .filter(Boolean).map(function (tag) { return '<span class="tag">' + escapeHtml(tag) + "</span>"; }).join("");
        var responsibilities = (job.responsibilities || []).map(function (item) { return "<li>" + escapeHtml(item) + "</li>"; }).join("");
        var requirements = (job.requiredSkills || []).map(function (item) { return "<li>" + escapeHtml(item) + "</li>"; }).join("");
        var education = (job.educationRequirements || []).map(function (item) { return "<li>" + escapeHtml(item) + "</li>"; }).join("");
        var certifications = (job.certifications || []).map(function (item) { return "<li>" + escapeHtml(item) + "</li>"; }).join("");
        var details = '<details class="job-details"><summary>View full role details</summary><p>' + escapeHtml(job.description) + '</p>' + (responsibilities ? '<h3>Responsibilities</h3><ul>' + responsibilities + '</ul>' : "") + (requirements ? '<h3>Required skills</h3><ul>' + requirements + '</ul>' : "") + (education ? '<h3>Education</h3><ul>' + education + '</ul>' : "") + (certifications ? '<h3>Certifications</h3><ul>' + certifications + '</ul>' : "") + '</details>';
        return '<article class="job-card"><div><div class="job-company">' + escapeHtml(job.companyName) + '</div><h2>' + escapeHtml(job.title) + '</h2><p>' + escapeHtml(description) + '</p><div class="tags">' + tags + '</div>' + details + '</div><a class="apply-button" href="application.html?jobId=' + encodeURIComponent(job.id) + '">Apply now</a></article>';
      }).join("");
    }).catch(function (error) {
      message.textContent = error.message + " Start the recruitment service and refresh this page.";
    });
  }

  var historyToggle = document.getElementById("history-toggle");
  var historyForm = document.getElementById("candidate-history-form");
  if (historyToggle && historyForm) {
    var historyMessage = document.getElementById("candidate-history-message");
    var historyList = document.getElementById("candidate-history-list");
    historyToggle.addEventListener("click", function () {
      var expanded = historyToggle.getAttribute("aria-expanded") === "true";
      historyToggle.setAttribute("aria-expanded", String(!expanded));
      historyForm.hidden = expanded;
      historyToggle.textContent = expanded ? "View my applications" : "Hide application sign-in";
    });
    historyForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (!historyForm.checkValidity()) return historyForm.reportValidity();
      var formData = new FormData(historyForm);
      historyMessage.textContent = "Loading your applications…";
      historyList.innerHTML = "";
      try {
        var credentials = { email: formData.get("email"), password: formData.get("password") };
        var responses = await Promise.all([
          request("/public/candidate/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(credentials) }),
          request("/public/ai-interviews/candidate/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(credentials) })
        ]);
        var data = responses[0];
        var interviewByApplication = new Map((responses[1].items || []).map(function (item) { return [String(item.applicationId), item]; }));
        var interviewLabels = { not_invited: "No interview invitation yet", invited: "Interview invitation sent by email", email_failed: "Interview email could not be delivered — contact the hiring team", started: "Interview in progress", completed: "Interview completed", revoked: "Invitation revoked", expired: "Invitation expired", alternative_requested: "Alternative assessment requested", not_available: "Interview no longer available" };
        historyMessage.textContent = data.items.length ? "Your application history" : "No applications were found for this account.";
        historyList.innerHTML = (data.items || []).map(function (item) {
          var job = item.job || {};
          var interview = interviewByApplication.get(String(item.applicationId));
          var interviewStatus = interview ? interview.emailStatus === "preview" && ["invited", "started"].includes(interview.status) ? "Interview invitation is not available by email yet" : interviewLabels[interview.status] || String(interview.status).replaceAll("_", " ") : "No interview invitation yet";
          return '<article class="history-row"><div><strong>' + escapeHtml(job.title || "Job no longer available") + '</strong><p>' + escapeHtml(job.companyName || "") + (job.department ? " · " + escapeHtml(job.department) : "") + '</p><p class="history-interview-status">AI interview: ' + escapeHtml(interviewStatus) + '</p></div><span class="history-status">' + escapeHtml(String(item.status || "pending").replaceAll("_", " ")) + '</span><time>' + escapeHtml(item.appliedAt ? new Date(item.appliedAt).toLocaleDateString() : "") + '</time></article>';
        }).join("");
      } catch (error) {
        historyMessage.textContent = error.message;
      }
    });
  }

  if (form) {
    var jobTitle = params.get("role") || sessionStorage.getItem("appliedRole") || "this position";
    var companyEl = document.getElementById("company-name");
    var errorEl = document.getElementById("form-error");
    var successEl = document.getElementById("form-success");
    var submitButton = form.querySelector('[type="submit"]');

    if (!jobId) {
      errorEl.textContent = "Choose an opening from the Job Openings page to apply.";
      submitButton.disabled = true;
    } else {
      request("/public/jobs/" + encodeURIComponent(jobId)).then(function (data) {
        jobTitle = data.job.title;
        roleEl.textContent = data.job.title;
        if (companyEl) companyEl.textContent = data.job.companyName;
      }).catch(function (error) {
        errorEl.textContent = error.message;
        submitButton.disabled = true;
      });
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      errorEl.textContent = "";
      if (successEl) { successEl.hidden = true; successEl.textContent = ""; }
      if (!form.checkValidity()) return form.reportValidity();
      if (!jobId) return;
      var file = document.getElementById("resume").files[0];
      if (!file || file.size > 5 * 1024 * 1024) {
        errorEl.textContent = file ? "Your resume must be 5 MB or smaller." : "Choose your resume before continuing.";
        return;
      }
      var body = new FormData(form);
      body.append("resume", file);
      submitButton.disabled = true;
      submitButton.textContent = "Submitting application…";
      try {
        var result = await request("/public/jobs/" + encodeURIComponent(jobId) + "/applications", { method: "POST", body: body });
        sessionStorage.setItem("appliedRole", result.jobTitle || jobTitle);
        sessionStorage.setItem("candidateName", result.candidateName || document.getElementById("full-name").value.trim());
        sessionStorage.setItem("applicationId", result.applicationId || "");
        if (successEl) {
          var screeningMessage = result.screeningStatus === "completed" ? "complete" : result.screeningStatus === "failed" ? "pending recruiter review" : "in progress";
          successEl.textContent = "Your application for " + (result.jobTitle || jobTitle) + " was received. Resume screening is " + screeningMessage + ". Use the same email and password on Job Openings to check your status.";
          successEl.hidden = false;
        }
        form.reset();
        submitButton.disabled = true;
        submitButton.textContent = "Application submitted";
      } catch (error) {
        errorEl.textContent = error.message;
        submitButton.disabled = false;
        submitButton.textContent = "Submit application";
      }
    });
  }

  var candidateName = document.getElementById("candidate-name");
  if (candidateName) candidateName.textContent = sessionStorage.getItem("candidateName") || "You";

  var end = document.getElementById("end-interview");
  if (end) end.addEventListener("click", function () {
    var done = document.getElementById("done");
    if (done) done.classList.add("show");
  });
})();
