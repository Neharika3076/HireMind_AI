import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Job } from "../models/job.js";
import { Candidate } from "../models/candidate.js";
import { Application } from "../models/application.js";
import { ScreeningResult } from "../models/screening-result.js";
import { extractResume, matchCandidate } from "../services/hiremind-client.js";
import { logActivity } from "../services/activity.js";
import { buildAtsJobProfile } from "../services/job-profile.js";

export const screeningRouter = Router();
const uploadPath = fileURLToPath(new URL("../../private-uploads/", import.meta.url));

screeningRouter.get("/jobs/:jobId", async (req, res, next) => { try {
  const job = await Job.findOne({ _id: req.params.jobId, organizationId: req.actor.organizationId }).lean();
  if (!job) return res.status(404).json({ error: "Job not found." });
  const applications = await Application.find({ jobId: job._id, organizationId: req.actor.organizationId })
    .populate("candidateId", "fullName email location phone profile")
    .sort({ appliedAt: -1 }).lean();
  const applicationIds = applications.map((application) => application._id);
  const results = await ScreeningResult.find({ organizationId: req.actor.organizationId, applicationId: { $in: applicationIds } }).sort({ createdAt: -1 }).lean();
  const latestByApplication = new Map();
  for (const result of results) if (!latestByApplication.has(String(result.applicationId))) latestByApplication.set(String(result.applicationId), result);
  const items = applications.map((application) => {
    const screening = latestByApplication.get(String(application._id));
    const safeApplication = { ...application };
    delete safeApplication.candidateAccountId;
    if (safeApplication.resumeDocument) {
      safeApplication.resumeDocument = { ...safeApplication.resumeDocument };
      delete safeApplication.resumeDocument.storageKey;
    }
    return {
      ...safeApplication,
      resumeAvailable: Boolean(application.resumeDocument?.storageKey || screening?.resumeFile?.storageKey),
      screeningStatus: screening?.status || (application.resumeDocument?.storageKey || screening?.resumeFile?.storageKey ? "pending" : "missing"),
      screeningResult: screening?.result || null,
      screeningFailure: screening?.status === "failed" ? screening.failureMessage : "",
      screeningId: screening?._id || null
    };
  });
  res.json({ job: { id: String(job._id), title: job.title, companyName: job.companyName, department: job.department, status: job.status }, items });
} catch (error) { next(error); } });

screeningRouter.post("/applications/:applicationId/retry", async (req, res, next) => { try {
  const application = await Application.findOne({ _id: req.params.applicationId, organizationId: req.actor.organizationId });
  if (!application) return res.status(404).json({ error: "Application not found." });
  let resumeDocument = application.resumeDocument;
  if (!resumeDocument?.storageKey) {
    const previous = await ScreeningResult.findOne({ applicationId: application._id, organizationId: req.actor.organizationId }).sort({ createdAt: -1 }).lean();
    if (previous?.resumeFile?.storageKey) resumeDocument = previous.resumeFile;
  }
  if (!resumeDocument?.storageKey || path.basename(resumeDocument.storageKey) !== resumeDocument.storageKey) return res.status(400).json({ error: "This application has no safely stored resume to retry." });
  const [job, candidate] = await Promise.all([
    Job.findOne({ _id: application.jobId, organizationId: req.actor.organizationId }),
    Candidate.findOne({ _id: application.candidateId, organizationId: req.actor.organizationId })
  ]);
  if (!job || !candidate) return res.status(404).json({ error: "The application job or candidate record could not be found." });
  const filePath = path.join(uploadPath, resumeDocument.storageKey);
  const file = { path: filePath, originalname: resumeDocument.originalName, mimetype: resumeDocument.mimeType, size: resumeDocument.size };
  const screening = await ScreeningResult.create({ organizationId: req.actor.organizationId, applicationId: application._id, jobId: job._id, candidateId: candidate._id, resumeFile: { originalName: file.originalname, storageKey: resumeDocument.storageKey }, status: "processing" });
  try {
    await fs.access(filePath);
    const extraction = await extractResume(file);
    screening.result = await matchCandidate(extraction.profile, buildAtsJobProfile(job));
    screening.status = "completed";
    screening.analyzedAt = new Date();
    application.resumeDocument = resumeDocument;
    await application.save();
  } catch (error) {
    screening.status = "failed";
    screening.failureCategory = "retry";
    screening.failureMessage = error.message;
  }
  await screening.save();
  await logActivity(req.actor, "retried application screening", "screening", screening._id, { applicationId: String(application._id), jobId: String(job._id) });
  if (screening.status === "failed") return res.status(503).json({ error: "Screening retry failed. The application and uploaded resume were retained; you can try again." });
  res.json({ status: screening.status, result: screening.result });
} catch (error) { next(error); } });
