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
        var tags = [job.workArrangement, job.employmentType, job.location, job.openings + " opening" + (job.openings === 1 ? "" : "s"), job.applicationDeadline ? "Apply by " + new Date(job.applicationDeadline).toLocaleDateString() : ""]
          .filter(Boolean).map(function (tag) { return '<span class="tag">' + escapeHtml(tag) + "</span>"; }).join("");
        return '<article class="job-card"><div><div class="job-company">' + escapeHtml(job.companyName) + '</div><h2>' + escapeHtml(job.title) + '</h2><p>' + escapeHtml(description) + '</p><div class="tags">' + tags + '</div></div><a class="apply-button" href="application.html?jobId=' + encodeURIComponent(job.id) + '">Apply now</a></article>';
      }).join("");
    }).catch(function (error) {
      message.textContent = error.message + " Start the recruitment service and refresh this page.";
    });
  }

  if (form) {
    var jobTitle = params.get("role") || sessionStorage.getItem("appliedRole") || "this position";
    var companyEl = document.getElementById("company-name");
    var errorEl = document.getElementById("form-error");
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
        location.href = "interview.html?applicationId=" + encodeURIComponent(result.applicationId || "");
      } catch (error) {
        errorEl.textContent = error.message;
        submitButton.disabled = false;
        submitButton.textContent = "Start AI interview →";
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
