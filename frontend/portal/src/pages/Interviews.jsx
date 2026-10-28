import { useCallback, useEffect, useRef, useState } from "react";
import { RECRUITMENT_API_BASE_URL } from "../config/api";
import "./Interviews.css";

const API_BASE = RECRUITMENT_API_BASE_URL;
const PUBLIC_API = `${API_BASE}/public/ai-interviews`;
const ACTIVE_INVITATION_KEY = "hiremindAiInterviewActiveInvitation";
const sessionStorageKey = (token) => `hiremindAiInterviewSession:${token}`;
const jobStorageKey = (token) => `hiremindAiInterviewJob:${token}`;

function InterviewButton({ children, className = "", ...props }) {
  return <button className={`candidate-interview-button ${className}`} {...props}>{children}</button>;
}

export default function Interviews() {
  const [invitationToken, setInvitationToken] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [access, setAccess] = useState(null);
  const [session, setSession] = useState(null);
  const [consent, setConsent] = useState(false);
  const [focusConsent, setFocusConsent] = useState(false);
  const [answer, setAnswer] = useState("");
  const [alternativeReason, setAlternativeReason] = useState("");
  const [alternativeOpen, setAlternativeOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [alternativeMessage, setAlternativeMessage] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [alternativeRequested, setAlternativeRequested] = useState(false);
  const answerRef = useRef(null);
  const focusMonitoring = useRef(false);

  const request = useCallback(async (path, options = {}, token = "") => {
    let response;
    try {
      response = await fetch(`${PUBLIC_API}${path}`, {
        ...options,
        headers: {
          ...(options.headers || {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch {
      throw new Error("The interview service could not be reached. Check your connection and try again.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "The interview service could not complete this request.");
    return data;
  }, []);

  const showSession = useCallback((data, token) => {
    setSession(data);
    setMessage("");
    if (data.status === "completed") {
      setIsComplete(true);
      sessionStorage.removeItem(sessionStorageKey(token));
      sessionStorage.removeItem(jobStorageKey(token));
      sessionStorage.removeItem(ACTIVE_INVITATION_KEY);
      return;
    }
    if (!data.question) {
      setMessage("Your answers are saved, but final evaluation is still processing. Refresh in a moment.");
      return;
    }
    setAnswer("");
    window.setTimeout(() => answerRef.current?.focus(), 0);
  }, [invitationToken]);

  useEffect(() => {
    const tokenFromLink = window.location.hash.slice(1);
    const activeToken = tokenFromLink || sessionStorage.getItem(ACTIVE_INVITATION_KEY) || "";
    setInvitationToken(activeToken);
    if (!activeToken) {
      setMessage("Open the secure interview link from your invitation email. The link is required to access this session.");
      return;
    }
    sessionStorage.setItem(ACTIVE_INVITATION_KEY, activeToken);
    const savedSessionToken = sessionStorage.getItem(sessionStorageKey(activeToken)) || "";
    setSessionToken(savedSessionToken);

    let active = true;
    const load = async () => {
      try {
        if (savedSessionToken) {
          const data = await request("/session", {}, savedSessionToken);
          if (!active) return;
          const savedJob = sessionStorage.getItem(jobStorageKey(activeToken));
          const job = savedJob ? JSON.parse(savedJob) : data.job;
          setAccess({ job: job || { title: "Your interview", companyName: "" } });
          showSession(data, activeToken);
          return;
        }
        const data = await request("/invite", {}, activeToken);
        if (!active) return;
        setAccess(data);
        sessionStorage.setItem(jobStorageKey(activeToken), JSON.stringify(data.job));
        if (data.status === "completed") setIsComplete(true);
      } catch (error) {
        if (active) setMessage(error.message);
      }
    };
    load();
    return () => { active = false; };
  }, [request, showSession]);

  useEffect(() => {
    focusMonitoring.current = focusConsent;
  }, [focusConsent]);

  useEffect(() => {
    if (!sessionToken || !session || !focusMonitoring.current) return undefined;
    const signal = (type) => {
      if (!focusMonitoring.current) return;
      fetch(`${PUBLIC_API}/integrity`, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ type }),
      }).catch(() => {});
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") signal("tab_focus_lost");
    };
    let disconnectedAt = 0;
    const onOffline = () => { disconnectedAt = Date.now(); };
    const onOnline = () => {
      if (disconnectedAt && Date.now() - disconnectedAt >= 1000) signal("connection_interrupted");
      disconnectedAt = 0;
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [session, sessionToken]);

  const startInterview = async () => {
    setStarting(true);
    setMessage("");
    try {
      const data = await request("/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true, focusMonitoringAccepted: focusConsent }),
      }, invitationToken);
      setSessionToken(data.sessionToken);
      sessionStorage.setItem(sessionStorageKey(invitationToken), data.sessionToken);
      sessionStorage.setItem(jobStorageKey(invitationToken), JSON.stringify(data.job || access?.job || {}));
      setAccess(data);
      focusMonitoring.current = focusConsent;
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      showSession(data, invitationToken);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setStarting(false);
    }
  };

  const requestAlternative = async (duringInterview = false) => {
    if (duringInterview && !window.confirm("Pause this interview and request an alternative assessment? This request will not lower your score.")) return;
    setMessage("");
    setAlternativeMessage("");
    try {
      const result = await request("/alternative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: duringInterview
            ? "Candidate requested an alternative during the interview."
            : alternativeReason,
        }),
      }, invitationToken);
      if (duringInterview) {
        sessionStorage.removeItem(sessionStorageKey(invitationToken));
        sessionStorage.removeItem(ACTIVE_INVITATION_KEY);
        setSessionToken("");
        setSession(null);
        setAlternativeRequested(true);
      }
      setAlternativeMessage(result.message || "Your request was sent to the hiring team.");
    } catch (error) {
      if (duringInterview) setMessage(error.message);
      else setAlternativeMessage(error.message);
    }
  };

  const submitAnswer = async (event) => {
    event.preventDefault();
    const cleanAnswer = answer.trim();
    if (!cleanAnswer || !session?.question?.id) {
      answerRef.current?.focus();
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const data = await request("/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: session.question.id, answer: cleanAnswer }),
      }, sessionToken);
      showSession(data, invitationToken);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const question = session?.question;
  const progress = question
    ? Math.round(((question.number - 1) / Math.max(1, question.total)) * 100)
    : 0;

  return (
    <main className="candidate-interview-shell">
      <header className="candidate-interview-brand">
        <a href="/" aria-label="HireMind home">HireMind <span>AI Interview</span></a>
        <span className="candidate-privacy-chip">Private session</span>
      </header>

      <section className="candidate-interview-card" aria-labelledby="candidate-interview-title">
        <p className="candidate-interview-eyebrow">STRUCTURED ROLE INTERVIEW</p>
        <h1 id="candidate-interview-title">{isComplete ? "Thank you" : access?.job?.title ? `Interview for ${access.job.title}` : "Your interview"}</h1>
        <p className="candidate-job-summary">
          {isComplete
            ? "Your interview is complete."
            : session
              ? "Your progress is saved. You can continue this interview."
              : access?.job
                ? `${access.job.title} · ${access.job.companyName || ""}${access.job.department ? ` · ${access.job.department}` : ""}`
                : "Checking your secure invitation…"}
        </p>

        {!isComplete && !session && access && !alternativeRequested && (
          <section className="candidate-access-panel">
            <div className="candidate-privacy-notice">
              <h2>Before you begin</h2>
              <p>{access.privacy}</p>
              <p className="candidate-subtle">{access.resumeContextNotice} Invitation expires {new Date(access.expiresAt).toLocaleString()}.</p>
            </div>
            <label className="candidate-consent">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              <span>I have read the privacy notice and agree to submit my answers for this interview.</span>
            </label>
            <label className="candidate-consent optional">
              <input type="checkbox" checked={focusConsent} onChange={(event) => setFocusConsent(event.target.checked)} />
              <span>Optional: allow this page to report when the interview tab loses focus and when the connection goes offline and recovers. These signals are imperfect, not proof of misconduct, and never change your score.</span>
            </label>
            <div className="candidate-interview-actions">
              <InterviewButton className="primary" disabled={!consent || starting} onClick={startInterview}>{starting ? "Preparing your interview…" : access.status === "started" ? "Resume interview" : "Start interview"}</InterviewButton>
              <InterviewButton className="secondary" onClick={() => setAlternativeOpen(true)}>Request an alternative</InterviewButton>
            </div>
            {alternativeOpen && <form className="candidate-alternative-form" onSubmit={(event) => { event.preventDefault(); requestAlternative(false); }}>
              <label className="candidate-field">Optional note for the hiring team<textarea rows="3" maxLength="500" value={alternativeReason} onChange={(event) => setAlternativeReason(event.target.value)} placeholder="Share any accommodation or format needs (optional)." /></label>
              <InterviewButton className="secondary">Send alternative request</InterviewButton>
            </form>}
            {alternativeMessage && <p className="candidate-status-message" role="status">{alternativeMessage}</p>}
          </section>
        )}

        {!isComplete && session && question && !alternativeRequested && (
          <section className="candidate-question-panel" aria-live="polite">
            <div className="candidate-progress-row">
              <span>Question {question.number} of {question.total}</span>
              <span className="candidate-question-kind">{question.kind === "follow_up" ? "Follow-up" : "Role question"}</span>
            </div>
            <progress value={progress} max="100" aria-label={`Interview progress: ${progress}%`} />
            <h2>{question.prompt}</h2>
            <form onSubmit={submitAnswer}>
              <label className="candidate-field" htmlFor="candidate-answer">Your answer
                <textarea id="candidate-answer" ref={answerRef} maxLength="5000" rows="9" required value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Explain your approach and relevant experience…" />
              </label>
              <div className="candidate-answer-footer">
                <span>Up to 5,000 characters. Your answer is saved before evaluation.</span>
                <InterviewButton className="primary" type="submit" disabled={submitting}>{submitting ? "Saving and evaluating…" : "Submit answer"}</InterviewButton>
              </div>
            </form>
            <InterviewButton className="secondary" onClick={() => requestAlternative(true)}>Request an alternative assessment</InterviewButton>
          </section>
        )}

        {!isComplete && session && !question && !alternativeRequested && (
          <p className="candidate-status-message" role="status">Your answers are saved, but final evaluation is still processing. Refresh in a moment.</p>
        )}

        {alternativeRequested && <section className="candidate-completion-panel"><div className="candidate-complete-icon">✓</div><h2>Request received</h2><p>{alternativeMessage || "The hiring team has received your alternative assessment request."}</p></section>}

        {isComplete && <section className="candidate-completion-panel">
          <div className="candidate-complete-icon" aria-hidden="true">✓</div>
          <h2>Interview submitted</h2>
          <p>Your responses were received. The hiring team will review the interview and contact you about next steps.</p>
          <p className="candidate-subtle">Your score and internal evaluation notes are private to the recruitment team.</p>
        </section>}

        {message && <div className="candidate-status-message error" role="alert">{message}</div>}
      </section>

      <footer className="candidate-interview-footer">Need an accommodation? Use “Request an alternative” or contact the hiring team. No camera, microphone, or screen recording is used.</footer>
    </main>
  );
}
