import crypto from "node:crypto";
import { Router } from "express";
import { Candidate } from "../models/candidate.js";
import { Application } from "../models/application.js";
import { Job } from "../models/job.js";
import { EmailLog } from "../models/email-log.js";
import { sendEmail, emailConfigured } from "../services/email.js";

export const emailsRouter = Router();
const templates = {
  application_received: { label: "Application received", subject: "We received your application for {{jobTitle}}", body: "Hi {{candidateName}},\n\nThank you for applying for {{jobTitle}} at {{companyName}}. Our hiring team will review your application and contact you about next steps.\n\nRegards,\n{{companyName}}" },
  request_information: { label: "Request for additional information", subject: "Additional information for {{jobTitle}}", body: "Hi {{candidateName}},\n\nThank you for your interest in {{jobTitle}}. Please reply with the additional information requested by our hiring team.\n\nRegards,\n{{companyName}}" },
  shortlisted: { label: "Shortlisted for interview", subject: "Next steps for {{jobTitle}}", body: "Hi {{candidateName}},\n\nWe would like to move forward with the next stage for {{jobTitle}}. We will share interview details shortly.\n\nRegards,\n{{companyName}}" },
  interview_scheduled: { label: "Interview scheduled", subject: "Interview scheduled: {{jobTitle}}", body: "Hi {{candidateName}},\n\nYour interview for {{jobTitle}} has been scheduled for {{interviewTime}}. {{meetingDetails}}\n\nRegards,\n{{companyName}}" },
  interview_rescheduled: { label: "Interview rescheduled", subject: "Interview rescheduled: {{jobTitle}}", body: "Hi {{candidateName}},\n\nYour interview for {{jobTitle}} has been rescheduled to {{interviewTime}}. {{meetingDetails}}\n\nRegards,\n{{companyName}}" },
  interview_reminder: { label: "Interview reminder", subject: "Reminder: interview for {{jobTitle}}", body: "Hi {{candidateName}},\n\nThis is a reminder about your interview for {{jobTitle}} at {{interviewTime}}. {{meetingDetails}}\n\nRegards,\n{{companyName}}" },
  status_update: { label: "Application update", subject: "Update on your application for {{jobTitle}}", body: "Hi {{candidateName}},\n\nThere is an update on your application for {{jobTitle}}. Please sign in or contact the hiring team for details.\n\nRegards,\n{{companyName}}" }
  ,offer_notification: { label: "Offer notification", subject: "An update from {{companyName}}", body: "Hi {{candidateName}},\n\nWe are pleased to share an important update about {{jobTitle}}. Please contact the hiring team to discuss next steps.\n\nRegards,\n{{companyName}}" }
  ,rejection_notification: { label: "Application decision", subject: "Update on {{jobTitle}}", body: "Hi {{candidateName}},\n\nThank you for the time you invested in the process for {{jobTitle}}. We have decided to move forward with other candidates at this time. We wish you the best in your search.\n\nRegards,\n{{companyName}}" }
  ,interview_follow_up: { label: "Interview follow-up", subject: "Thank you for interviewing for {{jobTitle}}", body: "Hi {{candidateName}},\n\nThank you for speaking with our team about {{jobTitle}}. We will be in touch when there is an update.\n\nRegards,\n{{companyName}}" }
};
function fill(text, values) {
  return text.replace(/{{(\w+)}}/g, (_token, key) => {
    if (!Object.hasOwn(values, key)) { const error = new Error(`Unknown email placeholder: {{${key}}}`); error.statusCode = 400; throw error; }
    return values[key] ?? "";
  });
}

async function buildMessage(actor, body) {
  const template = templates[body.templateKey];
  if (!template) { const error = new Error("Choose a valid email template."); error.statusCode = 400; throw error; }
  const application = await Application.findOne({ _id: body.applicationId, organizationId: actor.organizationId });
  if (!application) { const error = new Error("Application not found."); error.statusCode = 404; throw error; }
  const [candidate, job] = await Promise.all([Candidate.findById(application.candidateId), Job.findById(application.jobId)]);
  if (!candidate?.email || !job) { const error = new Error("The selected application needs a candidate email and job."); error.statusCode = 400; throw error; }
  const values = { candidateName: candidate.fullName, jobTitle: job.title, companyName: body.companyName || "HireMind", interviewTime: body.interviewTime || "the scheduled time", meetingDetails: body.meetingDetails || "" };
  return { template, application, candidate, subject: fill(body.subject || template.subject, values), text: fill(body.body || template.body, values) };
}

emailsRouter.get("/templates", (_req, res) => res.json({ templates: Object.entries(templates).map(([key, value]) => ({ key, ...value })) }));
emailsRouter.get("/logs", async (req, res, next) => { try { const items = await EmailLog.find({ organizationId: req.actor.organizationId }).populate("candidateId", "fullName email").populate({ path: "applicationId", populate: { path: "jobId", select: "title" } }).sort({ createdAt: -1 }).limit(100).lean(); res.json({ items, configured: emailConfigured }); } catch (error) { next(error); } });
emailsRouter.post("/preview", async (req, res, next) => { try { const message = await buildMessage(req.actor, req.body); res.json({ recipient: message.candidate.email, subject: message.subject, text: message.text, configured: emailConfigured }); } catch (error) { next(error); } });
emailsRouter.post("/send", async (req, res, next) => { try {
  if (req.body.confirm !== true || !req.body.idempotencyKey) return res.status(400).json({ error: "Confirm the email and include an idempotency key before sending." });
  const existing = await EmailLog.findOne({ organizationId: req.actor.organizationId, idempotencyKey: req.body.idempotencyKey });
  if (existing) return res.status(200).json({ item: existing, duplicate: true });
  const message = await buildMessage(req.actor, req.body);
  try { const delivery = await sendEmail({ to: message.candidate.email, subject: message.subject, text: message.text }); const item = await EmailLog.create({ organizationId: req.actor.organizationId, applicationId: message.application._id, candidateId: message.candidate._id, templateKey: req.body.templateKey, recipient: message.candidate.email, subject: message.subject, status: "sent", providerMessageId: delivery.messageId || "", idempotencyKey: req.body.idempotencyKey, sentBy: { id: req.actor.id, name: req.actor.name } }); res.status(201).json({ item }); }
  catch (error) { const item = await EmailLog.create({ organizationId: req.actor.organizationId, applicationId: message.application._id, candidateId: message.candidate._id, templateKey: req.body.templateKey, recipient: message.candidate.email, subject: message.subject, status: "failed", failureCategory: emailConfigured ? "delivery" : "configuration", idempotencyKey: req.body.idempotencyKey || crypto.randomUUID(), sentBy: { id: req.actor.id, name: req.actor.name } }); res.status(503).json({ error: "Email delivery is not available. Configure SMTP and try again.", item }); }
} catch (error) { next(error); } });
