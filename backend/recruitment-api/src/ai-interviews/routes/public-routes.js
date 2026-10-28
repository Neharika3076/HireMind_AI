import { Router } from "express";
import { CandidateAccount } from "../../models/candidate-account.js";
import { Application } from "../../models/application.js";
import { AIInterviewInvitation } from "../models/invitation.js";
import { verifyCandidatePassword } from "../../services/candidate-password.js";
import { getCandidateSession, openInvitation, recordIntegrityEvent, requestAlternative, startOrResumeInvitation, submitCandidateAnswer } from "../services/session-service.js";
import { createRateLimiter } from "../middleware/rate-limit.js";

export const aiInterviewPublicRouter = Router();
const limit = createRateLimiter({ limit: 35 });
aiInterviewPublicRouter.use(limit);

function bearer(req) { return String(req.header("authorization") || "").replace(/^Bearer\s+/i, "").trim(); }
function safeError(error, res, next) { if (error.statusCode) return res.status(error.statusCode).json({ error: error.message }); return next(error); }

aiInterviewPublicRouter.get("/invite", async (req, res, next) => {
  try { res.setHeader("Cache-Control", "no-store"); res.json(await openInvitation(bearer(req))); }
  catch (error) { safeError(error, res, next); }
});

aiInterviewPublicRouter.post("/start", async (req, res, next) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    res.json(await startOrResumeInvitation(bearer(req), { consent: req.body?.consent, focusMonitoringAccepted: req.body?.focusMonitoringAccepted === true }));
  } catch (error) { safeError(error, res, next); }
});

aiInterviewPublicRouter.get("/session", async (req, res, next) => {
  try { res.setHeader("Cache-Control", "no-store"); res.json(await getCandidateSession(bearer(req))); }
  catch (error) { safeError(error, res, next); }
});

aiInterviewPublicRouter.post("/answer", async (req, res, next) => {
  try { res.setHeader("Cache-Control", "no-store"); res.json(await submitCandidateAnswer(bearer(req), { questionId: req.body?.questionId, answer: req.body?.answer })); }
  catch (error) { safeError(error, res, next); }
});

aiInterviewPublicRouter.post("/integrity", async (req, res, next) => {
  try { res.setHeader("Cache-Control", "no-store"); res.json(await recordIntegrityEvent(bearer(req), req.body?.type)); }
  catch (error) { safeError(error, res, next); }
});

aiInterviewPublicRouter.post("/alternative", async (req, res, next) => {
  try { res.setHeader("Cache-Control", "no-store"); res.json(await requestAlternative(bearer(req), req.body?.reason)); }
  catch (error) { safeError(error, res, next); }
});

// Candidate job-history sign-in can view invitation state, but never tokens, scores, answers, or recruiter notes.
aiInterviewPublicRouter.post("/candidate/status", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || password.length > 128) return res.status(400).json({ error: "Enter a valid email and password." });
    const account = await CandidateAccount.findOne({ email }).select("+passwordSalt +passwordHash");
    if (!account || !await verifyCandidatePassword(password, account.passwordSalt, account.passwordHash)) return res.status(401).json({ error: "Email or password is incorrect." });
    const applications = await Application.find({ candidateAccountId: account._id }).select("_id status").lean();
    const applicationIds = applications.map((application) => application._id);
    const invitations = await AIInterviewInvitation.find({ applicationId: { $in: applicationIds } }).select("applicationId status emailStatus expiresAt").sort({ createdAt: -1 }).lean();
    const latest = new Map();
    for (const invitation of invitations) if (!latest.has(String(invitation.applicationId))) latest.set(String(invitation.applicationId), invitation);
    res.setHeader("Cache-Control", "no-store");
    res.json({ items: applications.map((application) => {
      const invitation = latest.get(String(application._id));
      const unavailable = ["rejected", "not_selected", "hired"].includes(application.status);
      const expired = invitation && ["invited", "started", "email_failed"].includes(invitation.status) && invitation.expiresAt <= new Date();
      return { applicationId: String(application._id), status: unavailable && invitation ? "not_available" : expired ? "expired" : invitation?.status || "not_invited", emailStatus: invitation?.emailStatus || null, expiresAt: invitation?.expiresAt || null };
    }) });
  } catch (error) { next(error); }
});
