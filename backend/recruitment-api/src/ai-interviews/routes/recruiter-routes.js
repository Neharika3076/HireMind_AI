import { Router } from "express";
import mongoose from "mongoose";
import { Job } from "../../models/job.js";
import { AIInterviewInvitation } from "../models/invitation.js";
import { AIInterviewSession } from "../models/session.js";
import { AIInterviewReport } from "../models/report.js";
import { AIInterviewIntegrityEvent } from "../models/integrity-event.js";
import { createInvitation, listApplicationInvitations, listJobInvitations, resendInvitation, revokeInvitation } from "../services/invitation-service.js";
import { listTemplates } from "../services/template-service.js";
import { logActivity } from "../../services/activity.js";

export const aiInterviewRecruiterRouter = Router();
const validId = (value) => mongoose.isValidObjectId(value);
async function logInterviewActivity(actor, action, entityType, entityId, metadata) {
  try { await logActivity(actor, action, entityType, entityId, metadata); }
  catch (error) { console.error("AI interview audit activity could not be recorded:", error.name); }
}

aiInterviewRecruiterRouter.get("/templates", async (req, res, next) => { try { res.json({ items: await listTemplates(req.actor.organizationId) }); } catch (error) { next(error); } });

aiInterviewRecruiterRouter.get("/jobs/:jobId/invitations", async (req, res, next) => { try {
  if (!validId(req.params.jobId)) return res.status(404).json({ error: "Job not found." });
  res.json(await listJobInvitations(req.actor, req.params.jobId));
} catch (error) { next(error); } });

aiInterviewRecruiterRouter.get("/applications/:applicationId/invitations", async (req, res, next) => { try {
  if (!validId(req.params.applicationId)) return res.status(404).json({ error: "Application not found." });
  res.json(await listApplicationInvitations(req.actor, req.params.applicationId));
} catch (error) { next(error); } });

aiInterviewRecruiterRouter.post("/applications/:applicationId/invitations", async (req, res, next) => { try {
  if (!validId(req.params.applicationId)) return res.status(404).json({ error: "Application not found." });
  const result = await createInvitation(req.actor, req.params.applicationId, req.body || {});
  const action = result.delivered ? "sent AI interview invitation" : "AI interview invitation email failed";
  await logInterviewActivity(req.actor, action, "ai_interview", result.invitation.id, { applicationId: req.params.applicationId, emailStatus: result.invitation.emailStatus });
  res.status(result.delivered ? 201 : 503).json(result);
} catch (error) { next(error); } });

aiInterviewRecruiterRouter.post("/invitations/:invitationId/resend", async (req, res, next) => { try {
  if (!validId(req.params.invitationId)) return res.status(404).json({ error: "Interview invitation not found." });
  const result = await resendInvitation(req.actor, req.params.invitationId);
  const action = result.delivered ? "resent AI interview invitation" : "AI interview invitation resend failed";
  await logInterviewActivity(req.actor, action, "ai_interview", result.invitation.id, { emailStatus: result.invitation.emailStatus });
  res.status(result.delivered ? 200 : 503).json(result);
} catch (error) { next(error); } });

aiInterviewRecruiterRouter.delete("/invitations/:invitationId", async (req, res, next) => { try {
  if (!validId(req.params.invitationId)) return res.status(404).json({ error: "Interview invitation not found." });
  const result = await revokeInvitation(req.actor, req.params.invitationId);
  await logInterviewActivity(req.actor, "revoked AI interview invitation", "ai_interview", req.params.invitationId, { cancellationEmailDelivered: result.cancellationEmailDelivered });
  res.json(result);
} catch (error) { next(error); } });

aiInterviewRecruiterRouter.get("/invitations/:invitationId/report", async (req, res, next) => { try {
  const { invitationId } = req.params;
  if (!validId(invitationId)) return res.status(404).json({ error: "Interview report not found." });
  const invitation = await AIInterviewInvitation.findOne({ _id: invitationId, organizationId: req.actor.organizationId }).select("applicationId jobId candidateId status sessionId templateSnapshot createdAt").lean();
  if (!invitation) return res.status(404).json({ error: "Interview invitation not found." });
  const report = await AIInterviewReport.findOne({ invitationId, organizationId: req.actor.organizationId }).lean();
  if (!report) return res.status(404).json({ error: "The candidate has not completed this interview." });
  const [session, integrityEvents, job] = await Promise.all([
    AIInterviewSession.findOne({ _id: report.sessionId, organizationId: req.actor.organizationId }).select("questions answers modelVersion rubricVersion completedAt").lean(),
    AIInterviewIntegrityEvent.find({ invitationId, organizationId: req.actor.organizationId }).select("type occurredAt details reviewStatus").sort({ occurredAt: 1 }).lean(),
    Job.findOne({ _id: report.jobId, organizationId: req.actor.organizationId }).select("title companyName").lean()
  ]);
  res.setHeader("Cache-Control", "no-store");
  res.json({ report, session, integrityEvents, job: job ? { title: job.title, companyName: job.companyName } : null, candidate: { id: String(invitation.candidateId) }, invitation: { id: String(invitation._id), status: invitation.status, createdAt: invitation.createdAt, template: invitation.templateSnapshot?.name } });
} catch (error) { next(error); } });

aiInterviewRecruiterRouter.post("/invitations/:invitationId/review", async (req, res, next) => { try {
  const { invitationId } = req.params;
  if (!validId(invitationId)) return res.status(404).json({ error: "Interview report not found." });
  const allowed = new Set(["needs_human_review", "progress_to_next_stage", "do_not_progress"]);
  if (!allowed.has(req.body?.decision)) return res.status(400).json({ error: "Choose a valid recruiter review decision." });
  const note = String(req.body?.note || "").trim().slice(0, 1000);
  const report = await AIInterviewReport.findOne({ invitationId, organizationId: req.actor.organizationId });
  if (!report) return res.status(404).json({ error: "Interview report not found." });
  report.reviewHistory.push({ decision: req.body.decision, note, actor: { id: req.actor.id, name: req.actor.name } });
  await report.save();
  await logInterviewActivity(req.actor, "reviewed AI interview", "ai_interview", invitationId, { decision: req.body.decision });
  res.json({ reviewHistory: report.reviewHistory });
} catch (error) { next(error); } });

aiInterviewRecruiterRouter.patch("/integrity/:eventId", async (req, res, next) => { try {
  if (!validId(req.params.eventId)) return res.status(404).json({ error: "Integrity event not found." });
  const reviewStatus = req.body?.reviewStatus;
  if (!["reviewed", "not_concerning"].includes(reviewStatus)) return res.status(400).json({ error: "Choose a valid integrity review status." });
  const event = await AIInterviewIntegrityEvent.findOneAndUpdate({ _id: req.params.eventId, organizationId: req.actor.organizationId }, { $set: { reviewStatus } }, { new: true }).select("type occurredAt reviewStatus");
  if (!event) return res.status(404).json({ error: "Integrity event not found." });
  await logInterviewActivity(req.actor, "reviewed AI interview integrity signal", "ai_interview_integrity", event._id, { reviewStatus });
  res.json({ event });
} catch (error) { next(error); } });
