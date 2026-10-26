import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Application } from "../models/application.js";
import { Candidate } from "../models/candidate.js";
import { Job } from "../models/job.js";
import { ScreeningResult } from "../models/screening-result.js";
import { logActivity } from "../services/activity.js";

export const applicationsRouter = Router();
const stages = new Set(["applied", "resume_processing", "awaiting_review", "shortlisted", "approved", "rejected", "interview_scheduled", "interview_completed", "decision_pending", "offer_extended", "offer_accepted", "hired", "not_selected"]);

applicationsRouter.get("/", async (req, res, next) => { try {
  const filter = { organizationId: req.actor.organizationId, ...(req.query.jobId ? { jobId: req.query.jobId } : {}), ...(req.query.status ? { status: req.query.status } : {}) };
  const items = await Application.find(filter).select("-candidateAccountId -resumeDocument.storageKey").populate({ path: "candidateId", match: { organizationId: req.actor.organizationId }, select: "fullName email location phone" }).populate({ path: "jobId", match: { organizationId: req.actor.organizationId }, select: "title department companyName" }).sort({ updatedAt: -1 }).lean();
  res.json({ items });
} catch (error) { next(error); } });

applicationsRouter.post("/", async (req, res, next) => { try {
  const { candidateId, jobId } = req.body;
  const [candidate, job] = await Promise.all([Candidate.findOne({ _id: candidateId, organizationId: req.actor.organizationId }), Job.findOne({ _id: jobId, organizationId: req.actor.organizationId })]);
  if (!candidate || !job) return res.status(400).json({ error: "Candidate or job was not found in this organization." });
  const application = await Application.create({ organizationId: req.actor.organizationId, candidateId, jobId, assignedRecruiter: { id: req.actor.id, name: req.actor.name }, statusHistory: [{ status: "awaiting_review", actor: { id: req.actor.id, name: req.actor.name } }] });
  await logActivity(req.actor, "created application", "application", application._id, { candidateId, jobId });
  res.status(201).json(application);
} catch (error) { next(error); } });

applicationsRouter.get("/:applicationId/resume", async (req, res, next) => { try {
  const application = await Application.findOne({ _id: req.params.applicationId, organizationId: req.actor.organizationId }).lean();
  if (!application) return res.status(404).json({ error: "Application not found." });
  let document = application.resumeDocument;
  if (!document?.storageKey) {
    const legacy = await ScreeningResult.findOne({ applicationId: application._id, organizationId: req.actor.organizationId }).sort({ createdAt: -1 }).lean();
    if (legacy?.resumeFile?.storageKey) document = legacy.resumeFile;
  }
  if (!document?.storageKey || path.basename(document.storageKey) !== document.storageKey) return res.status(404).json({ error: "No resume is available for this application." });
  const uploadPath = fileURLToPath(new URL("../../private-uploads/", import.meta.url));
  const filePath = path.join(uploadPath, document.storageKey);
  await fs.access(filePath);
  const isPdf = document.mimeType === "application/pdf" || path.extname(document.originalName || document.storageKey).toLowerCase() === ".pdf";
  res.setHeader("Content-Type", isPdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(document.originalName || "resume")}`);
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.sendFile(filePath);
} catch (error) { if (error.code === "ENOENT") return res.status(404).json({ error: "The resume file is no longer available." }); next(error); } });

applicationsRouter.get("/:applicationId", async (req, res, next) => { try {
  const application = await Application.findOne({ _id: req.params.applicationId, organizationId: req.actor.organizationId }).select("-candidateAccountId -resumeDocument.storageKey")
    .populate({ path: "candidateId", match: { organizationId: req.actor.organizationId }, select: "fullName email location phone profile" })
    .populate({ path: "jobId", match: { organizationId: req.actor.organizationId }, select: "title department companyName" }).lean();
  if (!application) return res.status(404).json({ error: "Application not found." });
  res.json({ application });
} catch (error) { next(error); } });

applicationsRouter.patch("/:applicationId/status", async (req, res, next) => { try {
  const { status, note = "" } = req.body;
  if (!stages.has(status)) return res.status(400).json({ error: "Invalid recruitment stage." });
  const application = await Application.findOne({ _id: req.params.applicationId, organizationId: req.actor.organizationId });
  if (!application) return res.status(404).json({ error: "Application not found." });
  application.status = status;
  if (["approved", "shortlisted", "rejected", "not_selected"].includes(status)) {
    application.decisionBy = { id: req.actor.id, name: req.actor.name };
    application.decisionAt = new Date();
  }
  application.statusHistory.push({ status, note: String(note).slice(0, 1000), actor: { id: req.actor.id, name: req.actor.name } });
  await application.save();
  await logActivity(req.actor, "changed application status", "application", application._id, { status });
  res.json(application);
} catch (error) { next(error); } });
