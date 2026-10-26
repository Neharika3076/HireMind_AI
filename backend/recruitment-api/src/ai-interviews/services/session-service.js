import crypto from "node:crypto";
import { AIInterviewInvitation } from "../models/invitation.js";
import { AIInterviewSession } from "../models/session.js";
import { AIInterviewReport } from "../models/report.js";
import { AIInterviewIntegrityEvent } from "../models/integrity-event.js";
import { Job } from "../../models/job.js";
import { Candidate } from "../../models/candidate.js";
import { Application } from "../../models/application.js";
import { interviewConfig, randomSecret, sha256 } from "../config.js";
import { generateQuestionPlan } from "./question-generator.js";
import { evaluateAnswer } from "./answer-evaluator.js";
import { generateFollowUp } from "./followup-generator.js";
import { scoreEvaluations } from "./scoring-service.js";
import { getIntegritySummary } from "./integrity-monitor.js";

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode, expose: true });
const answerLocks = new Map();
async function withSessionLock(key, callback) {
  const previous = answerLocks.get(key) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => { release = resolve; });
  answerLocks.set(key, current);
  await previous;
  try { return await callback(); }
  finally { release(); if (answerLocks.get(key) === current) answerLocks.delete(key); }
}
const activeApplication = (application) => application && !["rejected", "not_selected", "hired"].includes(application.status);
const publicQuestion = (session) => {
  if (session.pendingFollowUp) return { id: session.pendingFollowUp.id, prompt: session.pendingFollowUp.prompt, kind: "follow_up", number: session.currentQuestionIndex + 1, total: session.questions.length };
  const question = session.questions[session.currentQuestionIndex];
  return question ? { id: question.id, prompt: question.prompt, kind: "question", number: session.currentQuestionIndex + 1, total: session.questions.length } : null;
};
const sessionStatus = (session) => ({
  status: session.status,
  question: publicQuestion(session),
  progress: { current: Math.min(session.currentQuestionIndex + (session.pendingFollowUp ? 0 : 1), session.questions.length), total: session.questions.length, followUpsUsed: session.followUpsUsed },
  completedAt: session.completedAt
});

export async function openInvitation(rawToken) {
  if (!rawToken || rawToken.length < 32 || rawToken.length > 160) throw fail("This interview invitation is invalid or expired.", 404);
  const invitation = await AIInterviewInvitation.findOne({ tokenHash: sha256(rawToken) }).select("+tokenHash");
  if (!invitation || invitation.status === "revoked" || invitation.expiresAt <= new Date() || ["expired", "completed", "alternative_requested"].includes(invitation.status)) {
    if (invitation && invitation.expiresAt <= new Date() && !["revoked", "completed"].includes(invitation.status)) { invitation.status = "expired"; await invitation.save(); }
    throw fail("This interview invitation is no longer active. Contact the hiring team if you need help.", 410);
  }
  const [job, application] = await Promise.all([
    Job.findOne({ _id: invitation.jobId, organizationId: invitation.organizationId }).select("title companyName department").lean(),
    Application.findOne({ _id: invitation.applicationId, organizationId: invitation.organizationId }).select("status").lean()
  ]);
  if (!job || !activeApplication(application)) throw fail("This application is no longer active for this interview.", 410);
  return {
    status: invitation.status,
    job: { title: job.title, companyName: job.companyName || "Organization", department: job.department },
    expiresAt: invitation.expiresAt,
    privacy: "This is a text-only assessment. Your submitted answers and limited relevant resume context are sent to the configured AI provider for evaluation. We do not use camera, audio, screen recording, face or emotion analysis. If you opt in to technical monitoring, the browser may report that this interview tab lost focus and that your connection went offline and recovered. These are imperfect signals, not proof of misconduct, and they never change your score. You may request an alternative assessment without a penalty.",
    resumeContextNotice: "Only relevant profile details needed to tailor role questions are used; contact details are excluded."
  };
}

export async function startOrResumeInvitation(rawToken, { consent, focusMonitoringAccepted = false } = {}) {
  if (consent !== true) throw fail("Please review and accept the privacy notice before starting.");
  const preview = await openInvitation(rawToken);
  const invitation = await AIInterviewInvitation.findOne({ tokenHash: sha256(rawToken) }).select("+tokenHash");
  const application = await Application.findOne({ _id: invitation.applicationId, organizationId: invitation.organizationId });
  const [job, candidate] = await Promise.all([
    Job.findOne({ _id: invitation.jobId, organizationId: invitation.organizationId }).lean(),
    Candidate.findOne({ _id: invitation.candidateId, organizationId: invitation.organizationId }).select("profile").lean()
  ]);
  if (!job || !candidate || !activeApplication(application)) throw fail("This application is no longer active for this interview.", 410);

  const secret = randomSecret();
  let session = invitation.sessionId ? await AIInterviewSession.findOne({ _id: invitation.sessionId, organizationId: invitation.organizationId }) : null;
  if (session && ["completed", "cancelled"].includes(session.status)) throw fail("This interview session has already ended.", 410);
  if (!session) {
    const plan = await generateQuestionPlan({ job, candidateProfile: candidate.profile, template: invitation.templateSnapshot });
    const now = new Date();
    session = await AIInterviewSession.create({
      organizationId: invitation.organizationId, invitationId: invitation._id, applicationId: application._id, jobId: job._id, candidateId: candidate._id,
      accessTokenHash: sha256(secret), status: "in_progress", consent: { acceptedAt: now, privacyVersion: "2026-10-16", focusMonitoringAccepted: focusMonitoringAccepted === true },
      modelVersion: plan.modelVersion, rubricVersion: invitation.templateSnapshot.rubricVersion,
      questions: plan.questions, maxFollowUps: plan.maxFollowUps, retainUntil: new Date(now.getTime() + interviewConfig.retentionDays * 86400000)
    });
    invitation.sessionId = session._id;
  } else {
    session.accessTokenHash = sha256(secret);
    session.consent = { acceptedAt: new Date(), privacyVersion: "2026-10-16", focusMonitoringAccepted: focusMonitoringAccepted === true };
    await session.save();
  }
  invitation.status = "started";
  invitation.audit.push({ action: "candidate_started_or_resumed", actor: { id: "candidate", name: "Candidate" } });
  await invitation.save();
  return { sessionToken: secret, ...sessionStatus(session), job: preview.job };
}

export async function getCandidateSession(rawSessionToken) {
  const session = await findSessionByToken(rawSessionToken);
  if (session.status === "in_progress" || session.status === "evaluation_pending") await ensureActiveApplication(session);
  return sessionStatus(session);
}

async function findSessionByToken(rawSessionToken) {
  if (!rawSessionToken || rawSessionToken.length < 32 || rawSessionToken.length > 160) throw fail("The interview session could not be found. Reopen the secure invitation link.", 404);
  const session = await AIInterviewSession.findOne({ accessTokenHash: sha256(rawSessionToken) }).select("+accessTokenHash");
  if (!session) throw fail("The interview session could not be found. Reopen the secure invitation link.", 404);
  return session;
}

async function ensureActiveApplication(session) {
  const application = await Application.findOne({ _id: session.applicationId, organizationId: session.organizationId }).select("status").lean();
  if (!activeApplication(application)) throw fail("This interview is no longer active. Contact the hiring team.", 410);
}

export async function submitCandidateAnswer(rawSessionToken, { questionId, answer }) {
  const initialSession = await findSessionByToken(rawSessionToken);
  return withSessionLock(String(initialSession._id), () => submitCandidateAnswerLocked(rawSessionToken, { questionId, answer }));
}

async function submitCandidateAnswerLocked(rawSessionToken, { questionId, answer }) {
  const session = await findSessionByToken(rawSessionToken);
  await ensureActiveApplication(session);
  if (session.status !== "in_progress") throw fail("This interview is not accepting answers.", 409);
  if (typeof answer !== "string" || !answer.trim() || answer.length > interviewConfig.answerMaxChars) throw fail(`Enter an answer between 1 and ${interviewConfig.answerMaxChars} characters.`);
  const question = session.pendingFollowUp || session.questions[session.currentQuestionIndex];
  if (!question || question.id !== questionId) throw fail("This question is no longer current. Refresh the interview to continue.", 409);

  let savedAnswer = session.answers.find((item) => item.questionId === questionId);
  if (savedAnswer?.evaluationStatus === "completed") return getCandidateSession(rawSessionToken);
  if (!savedAnswer) {
    session.answers.push({ questionId, questionPrompt: question.prompt, kind: session.pendingFollowUp ? "follow_up" : "answer", text: answer.trim(), evaluationStatus: "processing" });
    savedAnswer = session.answers[session.answers.length - 1];
  } else {
    if (savedAnswer.text !== answer.trim()) throw fail("An answer for this question has already been submitted.", 409);
    savedAnswer.evaluationStatus = "processing";
    savedAnswer.evaluationError = "";
  }
  await session.save();

  const baseQuestion = session.questions.find((item) => item.id === (session.pendingFollowUp?.parentQuestionId || questionId));
  const priorAnswer = session.pendingFollowUp ? session.answers.find((item) => item.questionId === baseQuestion.id)?.text : "";
  try {
    savedAnswer.evaluation = await evaluateAnswer({ question: baseQuestion, answer: answer.trim(), previousAnswer: priorAnswer });
    savedAnswer.evaluationStatus = "completed";
    savedAnswer.evaluationError = "";
    if (session.pendingFollowUp) {
      session.pendingFollowUp = null;
      session.currentQuestionIndex += 1;
    } else if (savedAnswer.evaluation.recommendFollowUp && session.followUpsUsed < Math.min(interviewConfig.maxFollowUps, Number(session.maxFollowUps) || 0)) {
      // Follow-up generation gets one chance; provider failure is recorded and the base plan proceeds safely.
      try {
        const generated = await generateFollowUp({ question: baseQuestion, answer: answer.trim(), evaluation: savedAnswer.evaluation });
        session.pendingFollowUp = { id: crypto.randomUUID(), parentQuestionId: baseQuestion.id, prompt: generated.prompt };
        session.followUpsUsed += 1;
      } catch {
        session.warnings.push("A follow-up could not be generated; the fixed interview plan continued without it.");
        session.pendingFollowUp = null;
        session.currentQuestionIndex += 1;
      }
    } else session.currentQuestionIndex += 1;
    if (session.currentQuestionIndex >= session.questions.length && !session.pendingFollowUp) await completeSession(session);
    await session.save();
    return sessionStatus(session);
  } catch (error) {
    savedAnswer.evaluationStatus = "failed";
    savedAnswer.evaluationError = "Evaluation could not be completed. Retry the same answer.";
    await session.save();
    console.error("Interview answer evaluation failed:", error.name);
    throw fail("We saved your answer, but could not evaluate it yet. Retry the same answer; it will not be lost.", 503);
  }
}

async function completeSession(session) {
  if (session.status === "completed") return;
  const results = scoreEvaluations(session.answers);
  if (results.score === null) {
    session.status = "evaluation_pending";
    return;
  }
  session.status = "completed";
  session.completedAt = new Date();
  session.retainUntil = new Date(Date.now() + interviewConfig.retentionDays * 86400000);
  const [invitation, integritySummary] = await Promise.all([
    AIInterviewInvitation.findOne({ _id: session.invitationId, organizationId: session.organizationId }),
    getIntegritySummary(session)
  ]);
  if (!invitation) throw fail("The invitation could not be found.", 404);
  await AIInterviewReport.findOneAndUpdate({ invitationId: invitation._id, organizationId: session.organizationId }, {
    $set: {
      sessionId: session._id, applicationId: session.applicationId, jobId: session.jobId, candidateId: session.candidateId,
      score: results.score, confidence: results.confidence,
      summary: "Structured decision-support summary. Review each answer and evidence; this score is not a hiring decision.",
      questionResults: session.answers.filter((answer) => answer.evaluationStatus === "completed").map((answer) => ({ questionId: answer.questionId, answer: answer.text, evaluation: answer.evaluation })),
      warnings: [...results.warnings, ...(session.warnings || [])], integritySummary, modelVersion: session.modelVersion, rubricVersion: session.rubricVersion,
      retainUntil: new Date(Date.now() + interviewConfig.retentionDays * 86400000)
    }, $setOnInsert: { organizationId: session.organizationId }
  }, { upsert: true, new: true });
  invitation.status = "completed";
  invitation.audit.push({ action: "candidate_completed", actor: { id: "candidate", name: "Candidate" } });
  await invitation.save();
}

export async function recordIntegrityEvent(rawSessionToken, type) {
  const session = await findSessionByToken(rawSessionToken);
  if (session.status !== "in_progress" || !session.consent?.focusMonitoringAccepted) return { recorded: false };
  if (!["tab_focus_lost", "connection_interrupted"].includes(type)) throw fail("Unsupported integrity event.");
  const recentCount = await AIInterviewIntegrityEvent.countDocuments({ sessionId: session._id, organizationId: session.organizationId, type, occurredAt: { $gte: new Date(Date.now() - 60000) } });
  if (recentCount >= 10) return { recorded: false, rateLimited: true };
  await AIInterviewIntegrityEvent.create({ organizationId: session.organizationId, invitationId: session.invitationId, sessionId: session._id, type, details: "Observed browser/session signal only; not evidence of misconduct.", retainUntil: new Date(Date.now() + interviewConfig.retentionDays * 86400000) });
  return { recorded: true };
}

export async function requestAlternative(rawToken, reason = "") {
  const invitation = await AIInterviewInvitation.findOne({ tokenHash: sha256(rawToken) }).select("+tokenHash");
  if (!invitation || ["revoked", "expired", "completed"].includes(invitation.status) || invitation.expiresAt <= new Date()) throw fail("This interview invitation is not active.", 410);
  if (invitation.status === "alternative_requested") return { status: invitation.status, message: "Your alternative assessment request has already been sent to the hiring team." };
  invitation.status = "alternative_requested";
  invitation.alternativeReason = String(reason || "").trim().slice(0, 500);
  invitation.audit.push({ action: "alternative_assessment_requested", actor: { id: "candidate", name: "Candidate" } });
  await invitation.save();
  if (invitation.sessionId) {
    await AIInterviewSession.updateOne({ _id: invitation.sessionId, organizationId: invitation.organizationId }, { $set: { status: "cancelled", accessTokenHash: sha256(randomSecret()) } });
    await AIInterviewIntegrityEvent.create({ organizationId: invitation.organizationId, invitationId: invitation._id, sessionId: invitation.sessionId, type: "alternative_requested", details: "Candidate requested an alternative assessment.", retainUntil: new Date(Date.now() + interviewConfig.retentionDays * 86400000) });
  }
  return { status: invitation.status, message: "Your alternative-assessment request was recorded for the hiring team. It does not reduce your interview score." };
}

export const __testables = { sessionStatus, publicQuestion, activeApplication };
