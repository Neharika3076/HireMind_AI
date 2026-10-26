(function () {
  "use strict";

  var apiBase = window.HIREMIND_RECRUITMENT_API || ((["localhost", "127.0.0.1", "::1"].includes(location.hostname) || location.protocol === "file:") ? "http://127.0.0.1:3001/api/recruitment" : "/api/recruitment");
  var publicApi = apiBase + "/public/ai-interviews";
  var invitationToken = location.hash.slice(1) || sessionStorage.getItem("hiremindAiInterviewInvitationToken") || "";
  var sessionToken = sessionStorage.getItem("hiremindAiInterviewSessionToken") || "";
  var state = { focusMonitoringAccepted: false, currentQuestionId: "", started: false };
  var $ = function (selector) { return document.querySelector(selector); };

  function message(value, target) { (target || $("#page-message")).textContent = value || ""; }
  async function request(path, options, token) {
    options = options || {};
    options.headers = Object.assign({}, options.headers || {}, token ? { Authorization: "Bearer " + token } : {});
    var response = await fetch(publicApi + path, options);
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(data.error || "The interview service could not complete this request.");
    return data;
  }
  function json(body) { return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }; }
  function showCompletion() {
    $("#question-panel").hidden = true;
    $("#access-panel").hidden = true;
    $("#completion-panel").hidden = false;
    $("#page-title").textContent = "Thank you";
    $("#job-summary").textContent = "Your interview is complete.";
    message("");
  }
  function renderSession(data) {
    state.started = true;
    $("#access-panel").hidden = true;
    if (data.status === "completed") return showCompletion();
    $("#question-panel").hidden = false;
    if (!data.question) { message("Your answers are saved, but final evaluation is still processing. Refresh in a moment."); return; }
    state.currentQuestionId = data.question.id;
    $("#question-count").textContent = "Question " + data.question.number + " of " + data.question.total;
    $("#question-kind").textContent = data.question.kind === "follow_up" ? "Follow-up" : "Role question";
    $("#interview-progress").value = Math.round(((data.question.number - 1) / Math.max(1, data.question.total)) * 100);
    $("#question-prompt").textContent = data.question.prompt;
    $("#answer-text").value = "";
    $("#answer-text").focus();
    message("");
  }

  async function load() {
    try {
      if (sessionToken) {
        var session = await request("/session", {}, sessionToken);
        $("#job-summary").textContent = "Your progress is saved. You can continue this interview.";
        renderSession(session);
        return;
      }
      if (!invitationToken) throw new Error("Open the secure interview link from your invitation email. The link is required to access this session.");
      sessionStorage.setItem("hiremindAiInterviewInvitationToken", invitationToken);
      var access = await request("/invite", {}, invitationToken);
      $("#job-summary").textContent = access.job.title + " · " + access.job.companyName + (access.job.department ? " · " + access.job.department : "");
      $("#privacy-copy").textContent = access.privacy;
      $("#context-copy").textContent = access.resumeContextNotice + " Invitation expires " + new Date(access.expiresAt).toLocaleString() + ".";
      $("#access-panel").hidden = false;
      $("#page-title").textContent = "Interview for " + access.job.title;
      if (access.status === "started") $("#start-interview").textContent = "Resume interview";
    } catch (error) { message(error.message); }
  }

  $("#consent").addEventListener("change", function () { $("#start-interview").disabled = !this.checked; });
  $("#start-interview").addEventListener("click", async function () {
    var button = this;
    button.disabled = true;
    button.textContent = "Preparing your interview…";
    state.focusMonitoringAccepted = $("#focus-consent").checked;
    try {
      var data = await request("/start", json({ consent: true, focusMonitoringAccepted: state.focusMonitoringAccepted }), invitationToken);
      sessionToken = data.sessionToken;
      sessionStorage.setItem("hiremindAiInterviewSessionToken", sessionToken);
      sessionStorage.removeItem("hiremindAiInterviewInvitationToken");
      history.replaceState(null, "", location.pathname + location.search);
      $("#job-summary").textContent = data.job.title + " · " + data.job.companyName;
      renderSession(data);
    } catch (error) { message(error.message); button.disabled = false; button.textContent = "Start interview"; }
  });

  $("#alternative-request").addEventListener("click", async function () {
    var label = $("#alternative-reason-label");
    var button = this;
    if (!label.hidden) {
      button.disabled = true;
      try {
        var result = await request("/alternative", json({ reason: $("#alternative-reason").value }), invitationToken);
        message(result.message, $("#alternative-message"));
        button.textContent = "Request sent";
        $("#start-interview").disabled = true;
      } catch (error) { message(error.message, $("#alternative-message")); button.disabled = false; }
      return;
    }
    label.hidden = false;
    button.textContent = "Send alternative request";
    $("#alternative-reason").focus();
  });

  $("#in-session-alternative").addEventListener("click", async function () {
    if (!window.confirm("Pause this interview and request an alternative assessment? This request will not lower your score.")) return;
    this.disabled = true;
    try {
      var result = await request("/alternative", json({ reason: "Candidate requested an alternative during the interview." }), invitationToken);
      sessionToken = "";
      sessionStorage.removeItem("hiremindAiInterviewSessionToken");
      $("#question-panel").hidden = true;
      message(result.message);
    } catch (error) { message(error.message); this.disabled = false; }
  });

  $("#answer-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    var answer = $("#answer-text").value.trim();
    if (!answer) return $("#answer-text").focus();
    var button = $("#submit-answer");
    button.disabled = true;
    button.textContent = "Saving and evaluating…";
    try {
      var result = await request("/answer", json({ questionId: state.currentQuestionId, answer: answer }), sessionToken);
      renderSession(result);
    } catch (error) { message(error.message); button.disabled = false; button.textContent = "Retry answer"; }
    if (!$("#question-panel").hidden) { button.disabled = false; button.textContent = "Submit answer"; }
  });

  function sendSignal(type) {
    if (!state.started || !state.focusMonitoringAccepted || !sessionToken) return;
    fetch(publicApi + "/integrity", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json", Authorization: "Bearer " + sessionToken }, body: JSON.stringify({ type: type }) }).catch(function () {});
  }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") sendSignal("tab_focus_lost"); });
  var disconnectedAt = 0;
  window.addEventListener("offline", function () { disconnectedAt = Date.now(); });
  window.addEventListener("online", function () { if (disconnectedAt && Date.now() - disconnectedAt >= 1000) sendSignal("connection_interrupted"); disconnectedAt = 0; });

  load();
})();
