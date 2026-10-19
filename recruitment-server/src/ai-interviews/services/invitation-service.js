import crypto from "node:crypto";
import { config } from "../../config.js";
import { Application } from "../../models/application.js";
import { Candidate } from "../../models/candidate.js";
import { Job } from "../../models/job.js";
import { ScreeningResult } from "../../models/screening-result.js";
import { EmailLog } from "../../models/email-log.js";
import { sendEmail } from "../../services/email.js";
import { AIInterviewInvitation } from "../models/invitation.js";
import { AIInterviewSession } from "../models/session.js";
import { AIInterviewTemplate } from "../models/template.js";
import { interviewConfig, randomSecret, sha256 } from "../config.js";
import { ensureDefaultTemplate } from "./template-service.js";

const badRequest = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode, expose: true });
const safeStatus = (invitation) => ({
  id: String(invitation._id), applicationId: String(invitation.applicationId), status: ["invited", "started", "email_failed"].includes(invitation.status) && invitation.expiresAt <= new Date() ? "expired" : invitation.status,
  emailStatus: invitation.emailStatus, expiresAt: invitation.expiresAt, lastSentAt: invitation.lastSentAt,
  sendCount: invitation.sendCount, createdAt: invitation.createdAt,
  template: invitation.templateSnapshot?.name || "Structured role interview"
});

async function deliverInvitation({ invitation, candidate, job }) {
  const rawToken = randomSecret();
  invitation.tokenHash = sha256(rawToken);
  invitation.status = "invited";
  invitation.emailStatus = "pending";
  const url = `${(process.env.PUBLIC_APP_URL || config.allowedOrigin).replace(/\/$/, "")}/ai-interview.html#${rawToken}`;
  const subject = `Interview invitation: ${job.title}`;
  const text = [
    `Hello ${candidate.fullName || "Candidate"},`,
    "",
    `You are invited to complete a structured AI-assisted interview for ${job.title} at ${job.companyName || "the organization"}.`,
    "",
    `Open your secure interview link: ${url}`,
    `Invitation expires: ${new Date(invitation.expiresAt).toLocaleString()}.`,
    "",
    "The interview is text-only. Your submitted answers and limited relevant resume context are sent to the configured AI provider for evaluation. No camera, audio, or screen recording is used. If you opt in to technical monitoring, the browser may report that this tab lost focus and that your connection went offline and recovered. These are imperfect signals, not proof of misconduct, and never change your score. You may request an alternative assessment without penalty.",
    "",
    "Please do not forward this secure link. Contact the hiring team if you need an alternative format or accommodation."
  ].join("\n");
  const idempotencyKey = crypto.randomUUID();
  await invitation.save();
  let delivery;
  try {
    delivery = await sendEmail({ to: candidate.email, subject, text });
  } catch (error) {
    try {
      await EmailLog.create({ organizationId: invitation.organizationId, applicationId: invitation.applicationId, candidateId: invitation.candidateId, templateKey: "ai_interview_invitation", recipient: candidate.email, subject, status: "failed", failureCategory: "delivery_or_configuration", idempotencyKey, sentBy: invitation.invitedBy });
    } catch (logError) {
      if (logError.code !== 11000) console.error("Could not record interview email attempt:", logError.name);
    }
    invitation.emailStatus = "failed";
    invitation.status = "email_failed";
    invitation.audit.push({ action: "invitation_email_failed", actor: invitation.invitedBy });
    await invitation.save();
    console.error("AI interview invitation email delivery failed:", {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      command: error?.command,
      response: error?.response,
      responseCode: error?.responseCode,
      stack: error?.stack,
    });
    return { delivered: false, invitation: safeStatus(invitation), error: "The interview invitation could not be emailed. Check SMTP settings and resend; the link was not marked as sent." };
  }
  invitation.emailStatus = "sent";
  invitation.status = "invited";
  invitation.lastSentAt = new Date();
  invitation.sendCount += 1;
  await invitation.save();
  try { await EmailLog.create({ organizationId: invitation.organizationId, applicationId: invitation.applicationId, candidateId: invitation.candidateId, templateKey: "ai_interview_invitation", recipient: candidate.email, subject, status: "sent", providerMessageId: delivery.messageId || "", idempotencyKey, sentBy: invitation.invitedBy }); }
  catch (error) { console.error("AI interview invitation was accepted by the email provider, but could not be logged:", error.name); }
  return { delivered: true, invitation: safeStatus(invitation) };
}

export async function createInvitation(actor, applicationId, { templateKey = "structured-role-interview-v1", expiresInDays } = {}) {
  const application = await Application.findOne({ _id: applicationId, organizationId: actor.organizationId });
  if (!application) throw badRequest("Application not found.", 404);
  if (["rejected", "not_selected", "hired"].includes(application.status)) throw badRequest("This application is not active for an interview invitation.", 409);
  const screening = await ScreeningResult.findOne({ organizationId: actor.organizationId, applicationId: application._id, status: "completed" }).sort({ createdAt: -1 }).lean();
  if (!screening) throw badRequest("Complete resume screening before inviting this candidate. Screening is an eligibility check, not an automatic hiring decision.", 409);
  const [candidate, job] = await Promise.all([
    Candidate.findOne({ _id: application.candidateId, organizationId: actor.organizationId }),
    Job.findOne({ _id: application.jobId, organizationId: actor.organizationId })
  ]);
  if (!candidate?.email || !job) throw badRequest("The selected application needs a candidate email and an existing job.", 400);
  const defaultTemplate = await ensureDefaultTemplate(actor.organizationId);
  const template = templateKey === defaultTemplate.key ? defaultTemplate : await AIInterviewTemplate.findOne({ organizationId: actor.organizationId, key: templateKey, active: true }).lean();
  if (!template) throw badRequest("Choose an active interview template.");
  const existing = await AIInterviewInvitation.findOne({ organizationId: actor.organizationId, applicationId: application._id }).sort({ createdAt: -1 });
  if (existing) throw badRequest("An AI interview invitation already exists for this application. Resend or renew it when needed; completed, revoked, or alternative-assessment invitations cannot be duplicated.", 409);
  const days = Math.min(interviewConfig.maxInviteDays, Math.max(1, Number(expiresInDays) || interviewConfig.defaultInviteDays));
  const now = new Date();
  let invitation;
  try {
    invitation = await AIInterviewInvitation.create({
      organizationId: actor.organizationId, applicationId: application._id, jobId: job._id, candidateId: candidate._id,
      templateId: template._id, templateSnapshot: { key: template.key, name: template.name, questionCount: template.questionCount, maxFollowUps: template.maxFollowUps, rubricVersion: template.rubricVersion, criteria: template.criteria },
      tokenHash: sha256(randomSecret()), expiresAt: new Date(now.getTime() + days * 86400000), retainUntil: new Date(now.getTime() + (days + interviewConfig.retentionDays) * 86400000),
      status: "email_failed", emailStatus: "pending", invitedBy: { id: actor.id, name: actor.name }, audit: [{ action: "created", actor: { id: actor.id, name: actor.name } }]
    });
  } catch (error) {
    if (error.code === 11000) throw badRequest("An AI interview invitation was created for this application. Refresh the Screening view.", 409);
    throw error;
  }
  return deliverInvitation({ invitation, candidate, job });
}

export async function listJobInvitations(actor, jobId) {
  const job = await Job.findOne({ _id: jobId, organizationId: actor.organizationId }).select("_id").lean();
  if (!job) throw badRequest("Job not found.", 404);
  const items = await AIInterviewInvitation.find({ organizationId: actor.organizationId, jobId }).sort({ createdAt: -1 }).limit(500).lean();
  return { items: items.map(safeStatus) };
}

export async function listApplicationInvitations(actor, applicationId) {
  const application = await Application.findOne({ _id: applicationId, organizationId: actor.organizationId }).select("_id").lean();
  if (!application) throw badRequest("Application not found.", 404);
  const items = await AIInterviewInvitation.find({ organizationId: actor.organizationId, applicationId }).sort({ createdAt: -1 }).limit(20).lean();
  return { items: items.map(safeStatus) };
}

async function getInvitationRelations(actor, invitationId) {
  const invitation = await AIInterviewInvitation.findOne({ _id: invitationId, organizationId: actor.organizationId });
  if (!invitation) throw badRequest("Interview invitation not found.", 404);
  const [candidate, job] = await Promise.all([
    Candidate.findOne({ _id: invitation.candidateId, organizationId: actor.organizationId }),
    Job.findOne({ _id: invitation.jobId, organizationId: actor.organizationId })
  ]);
  if (!candidate || !job) throw badRequest("Interview candidate or job could not be found.", 404);
  return { invitation, candidate, job };
}

export async function resendInvitation(actor, invitationId) {
  const { invitation, candidate, job } = await getInvitationRelations(actor, invitationId);
  if (["revoked", "completed", "alternative_requested"].includes(invitation.status)) throw badRequest("This invitation cannot be resent.", 409);
  const application = await Application.findOne({ _id: invitation.applicationId, organizationId: actor.organizationId }).select("status").lean();
  if (!application || ["rejected", "not_selected", "hired"].includes(application.status)) throw badRequest("This application is no longer active for an interview invitation.", 409);
  invitation.expiresAt = new Date(Date.now() + interviewConfig.defaultInviteDays * 86400000);
  invitation.retainUntil = new Date(invitation.expiresAt.getTime() + interviewConfig.retentionDays * 86400000);
  invitation.audit.push({ action: "resent", actor: { id: actor.id, name: actor.name } });
  await invitation.save();
  return deliverInvitation({ invitation, candidate, job });
}


export async function revokeInvitation(actor, invitationId) {
  const { invitation, candidate, job } = await getInvitationRelations(actor, invitationId);
  if (["completed", "revoked"].includes(invitation.status)) throw badRequest("This invitation is already closed.", 409);
  invitation.tokenHash = sha256(randomSecret());
  invitation.status = "revoked";
  invitation.emailStatus = invitation.emailStatus === "sent" ? "sent" : invitation.emailStatus;
  invitation.audit.push({ action: "revoked", actor: { id: actor.id, name: actor.name } });
  await invitation.save();
  if (invitation.sessionId) await AIInterviewSession.updateOne({ _id: invitation.sessionId, organizationId: actor.organizationId }, { $set: { status: "cancelled", accessTokenHash: sha256(randomSecret()) } });
  const subject = `Interview invitation cancelled: ${job.title}`;
  const text = `Hello ${candidate.fullName || "Candidate"},\n\nThe AI interview invitation for ${job.title} has been cancelled by the hiring team. Please contact them if you have questions.\n\nRegards,\n${job.companyName || "The hiring team"}`;
  let cancellationEmailDelivered = false;
  // Older preview-only invitations were never delivered, so cancellation needs no email.
  const cancellationEmailSkipped = invitation.emailStatus === "preview";
  const idempotencyKey = crypto.randomUUID();
  if (cancellationEmailSkipped) return { invitation: safeStatus(invitation), cancellationEmailDelivered, cancellationEmailSkipped: true };
  try {
    const delivery = await sendEmail({ to: candidate.email, subject, text });
    cancellationEmailDelivered = true;
    try { await EmailLog.create({ organizationId: actor.organizationId, applicationId: invitation.applicationId, candidateId: candidate._id, templateKey: "ai_interview_cancellation", recipient: candidate.email, subject, status: "sent", providerMessageId: delivery.messageId || "", idempotencyKey, sentBy: { id: actor.id, name: actor.name } }); }
    catch (error) { console.error("AI interview cancellation email was sent, but could not be logged:", error.name); }
  } catch (error) {
    try { await EmailLog.create({ organizationId: actor.organizationId, applicationId: invitation.applicationId, candidateId: candidate._id, templateKey: "ai_interview_cancellation", recipient: candidate.email, subject, status: "failed", failureCategory: "delivery_or_configuration", idempotencyKey, sentBy: { id: actor.id, name: actor.name } }); }
    catch (logError) { console.error("Could not record interview cancellation email attempt:", logError.name); }
    console.error("AI interview cancellation email delivery failed:", error.name);
  }
  return { invitation: safeStatus(invitation), cancellationEmailDelivered, cancellationEmailSkipped };
}
