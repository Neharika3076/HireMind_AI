import { Router } from "express";
import fs from "node:fs/promises";
import mongoose from "mongoose";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Job } from "../models/job.js";
import { Application } from "../models/application.js";
import { Candidate } from "../models/candidate.js";
import { ScreeningResult } from "../models/screening-result.js";
import { Interview } from "../models/interview.js";
import { EmailLog } from "../models/email-log.js";
import { RecruitmentActivity } from "../models/activity.js";
import { requireAdminOrExecutive, requireAdmin } from "../middleware/auth.js";
import { analyzeJob } from "../services/hiremind-client.js";
import { logActivity } from "../services/activity.js";

export const jobsRouter = Router();
const safeArray = (value) => Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];
const jobPayload = (body, actor) => ({
  companyName: String(body.companyName || "").trim(), title: String(body.title || "").trim(), department: String(body.department || "").trim(), hiringManagerId: String(body.hiringManagerId || ""), hiringManagerName: String(body.hiringManagerName || ""), employmentType: body.employmentType, workArrangement: body.workArrangement, location: String(body.location || "").trim(), description: String(body.description || "").trim(), responsibilities: safeArray(body.responsibilities), requiredSkills: safeArray(body.requiredSkills), preferredSkills: safeArray(body.preferredSkills), minimumExperience: Number(body.minimumExperience || 0), preferredExperience: Number(body.preferredExperience || 0), educationRequirements: safeArray(body.educationRequirements), certifications: safeArray(body.certifications), openings: Number(body.openings || 0), applicationDeadline: body.applicationDeadline || null, updatedBy: { id: actor.id, name: actor.name }
});
function validJob(job) { return job.title && job.department && job.description && job.employmentType && job.workArrangement && job.openings > 0; }

jobsRouter.get("/", async (req, res, next) => { try {
  const { status, search = "", page = 1, limit = 20 } = req.query;
  const filter = { organizationId: req.actor.organizationId, ...(status ? { status } : {}) };
  if (search) filter.$or = [{ title: new RegExp(String(search), "i") }, { department: new RegExp(String(search), "i") }];
  const [jobs, total] = await Promise.all([Job.find(filter).sort({ updatedAt: -1 }).skip((Number(page) - 1) * Number(limit)).limit(Number(limit)).lean(), Job.countDocuments(filter)]);
  const ids = jobs.map((job) => job._id);
  const applicationCounts = await Application.aggregate([{ $match: { organizationId: req.actor.organizationId, jobId: { $in: ids } } }, { $group: { _id: "$jobId", applicants: { $sum: 1 } } }]);
  const screeningCounts = await ScreeningResult.aggregate([{ $match: { organizationId: req.actor.organizationId, jobId: { $in: ids }, status: "completed" } }, { $group: { _id: "$jobId", screened: { $sum: 1 } } }]);
  const applicantsByJob = new Map(applicationCounts.map((item) => [String(item._id), item.applicants]));
  const screenedByJob = new Map(screeningCounts.map((item) => [String(item._id), item.screened]));
  res.json({ items: jobs.map((job) => ({ ...job, metrics: { applicants: applicantsByJob.get(String(job._id)) || 0, screened: screenedByJob.get(String(job._id)) || 0 } })), total, page: Number(page), limit: Number(limit) });
} catch (error) { next(error); } });

jobsRouter.post("/", requireAdminOrExecutive, async (req, res, next) => { try {
  const payload = jobPayload(req.body, req.actor); if (!validJob(payload)) return res.status(400).json({ error: "Title, department, employment details, description, and at least one opening are required." });
  const job = await Job.create({ ...payload, status: "draft", organizationId: req.actor.organizationId, createdBy: { id: req.actor.id, name: req.actor.name } });
  await logActivity(req.actor, "created job", "job", job._id, { title: job.title, status: job.status }); res.status(201).json(job);
} catch (error) { next(error); } });

jobsRouter.get("/:jobId", async (req, res, next) => { try { const job = await Job.findOne({ _id: req.params.jobId, organizationId: req.actor.organizationId }); if (!job) return res.status(404).json({ error: "Job not found." }); res.json(job); } catch (error) { next(error); } });
jobsRouter.patch("/:jobId", requireAdminOrExecutive, async (req, res, next) => { try { const payload = jobPayload(req.body, req.actor); if (!validJob(payload)) return res.status(400).json({ error: "Title, department, employment details, description, and at least one opening are required." }); const job = await Job.findOneAndUpdate({ _id: req.params.jobId, organizationId: req.actor.organizationId }, payload, { new: true, runValidators: true }); if (!job) return res.status(404).json({ error: "Job not found." }); await logActivity(req.actor, "updated job", "job", job._id, { title: job.title }); res.json(job); } catch (error) { next(error); } });
jobsRouter.post("/:jobId/publish", requireAdminOrExecutive, async (req, res, next) => { try { const job = await Job.findOne({ _id: req.params.jobId, organizationId: req.actor.organizationId }); if (!job) return res.status(404).json({ error: "Job not found." }); if (!validJob(job)) return res.status(400).json({ error: "Complete the required job details before publishing." }); job.status = "published"; job.updatedBy = { id: req.actor.id, name: req.actor.name }; await job.save(); await logActivity(req.actor, "published job", "job", job._id, { title: job.title }); res.json(job); } catch (error) { next(error); } });
jobsRouter.post("/:jobId/close", requireAdminOrExecutive, async (req, res, next) => { try { const job = await Job.findOneAndUpdate({ _id: req.params.jobId, organizationId: req.actor.organizationId }, { status: "closed", updatedBy: { id: req.actor.id, name: req.actor.name } }, { new: true }); if (!job) return res.status(404).json({ error: "Job not found." }); await logActivity(req.actor, "closed job", "job", job._id, { title: job.title }); res.json(job); } catch (error) { next(error); } });
jobsRouter.post("/:jobId/archive", requireAdminOrExecutive, async (req, res, next) => { try { const job = await Job.findOneAndUpdate({ _id: req.params.jobId, organizationId: req.actor.organizationId }, { status: "archived", updatedBy: { id: req.actor.id, name: req.actor.name } }, { new: true }); if (!job) return res.status(404).json({ error: "Job not found." }); await logActivity(req.actor, "archived job", "job", job._id, { title: job.title }); res.json(job); } catch (error) { next(error); } });
jobsRouter.delete("/:jobId", requireAdmin, async (req, res, next) => { try {
  if (!mongoose.isValidObjectId(req.params.jobId)) return res.status(404).json({ error: "Job not found." });
  const filter = { _id: req.params.jobId, organizationId: req.actor.organizationId };
  // Stop new public submissions before cascading related records. If cleanup
  // subsequently fails, the remaining job is safely left closed for review.
  const job = await Job.findOneAndUpdate(filter, { status: "closed" }, { new: true }).lean();
  if (!job) return res.status(404).json({ error: "Job not found." });
  const applications = await Application.find({ organizationId: req.actor.organizationId, jobId: job._id }).select("_id candidateId resumeDocument.storageKey").lean();
  const applicationIds = applications.map((application) => application._id);
  const candidateIds = [...new Set(applications.map((application) => application.candidateId ? String(application.candidateId) : "").filter((id) => mongoose.isValidObjectId(id)))].map((id) => new mongoose.Types.ObjectId(id));
  const candidateRows = candidateIds.length
    ? await Candidate.find({ organizationId: req.actor.organizationId, _id: { $in: candidateIds } }).select("_id resumeFiles.storageKey").lean()
    : [];
  const screeningRows = await ScreeningResult.find({ organizationId: req.actor.organizationId, $or: [{ jobId: job._id }, { applicationId: { $in: applicationIds } }] }).select("_id resumeFile.storageKey").lean();
  const interviewRows = await Interview.find({ organizationId: req.actor.organizationId, $or: [{ jobId: job._id }, { applicationId: { $in: applicationIds } }] }).select("_id").lean();
  const screeningIds = screeningRows.map((item) => String(item._id));
  const interviewIds = interviewRows.map((item) => String(item._id));
  const resumeKeys = [...new Set([
    ...applications.map((application) => application.resumeDocument?.storageKey),
    ...screeningRows.map((result) => result.resumeFile?.storageKey),
    ...candidateRows.flatMap((candidate) => (candidate.resumeFiles || []).map((file) => file.storageKey))
  ].filter(Boolean))];

  let removedCandidates = 0;
  const removeOrphanedCandidates = async (session) => {
    if (!candidateIds.length) return;
    // A candidate profile is organization-scoped. Keep it if the candidate
    // still has an application for any other job in this organization.
    const remainingQuery = Application.distinct("candidateId", {
      organizationId: req.actor.organizationId,
      candidateId: { $in: candidateIds }
    });
    if (session) remainingQuery.session(session);
    const remainingCandidateIds = await remainingQuery;
    const remaining = new Set(remainingCandidateIds.map(String));
    const orphanedIds = candidateIds.filter((id) => !remaining.has(String(id)));
    if (!orphanedIds.length) return;
    const result = await Candidate.deleteMany({ organizationId: req.actor.organizationId, _id: { $in: orphanedIds } }, session ? { session } : undefined);
    removedCandidates = result.deletedCount || 0;
  };

  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  const supportsTransactions = Boolean(hello.setName || hello.msg === "isdbgrid");
  if (supportsTransactions) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await EmailLog.deleteMany({ organizationId: req.actor.organizationId, applicationId: { $in: applicationIds } }, { session });
        await Interview.deleteMany({ organizationId: req.actor.organizationId, $or: [{ jobId: job._id }, { applicationId: { $in: applicationIds } }] }, { session });
        await ScreeningResult.deleteMany({ organizationId: req.actor.organizationId, $or: [{ jobId: job._id }, { applicationId: { $in: applicationIds } }] }, { session });
        await RecruitmentActivity.deleteMany({ organizationId: req.actor.organizationId, $or: [{ entityType: "job", entityId: String(job._id) }, { entityType: "application", entityId: { $in: applicationIds.map(String) } }, { entityType: "screening", entityId: { $in: screeningIds } }, { entityType: "interview", entityId: { $in: interviewIds } }] }, { session });
        await Application.deleteMany({ organizationId: req.actor.organizationId, jobId: job._id }, { session });
        await removeOrphanedCandidates(session);
        const deleted = await Job.deleteOne(filter, { session });
        if (!deleted.deletedCount) throw Object.assign(new Error("Job not found."), { statusCode: 404 });
      });
    } finally { await session.endSession(); }
  } else {
    // Local standalone MongoDB does not support transactions. Remove children
    // in dependency order and delete the job last so failures never leave a
    // visible job whose application data was only partly removed.
    await EmailLog.deleteMany({ organizationId: req.actor.organizationId, applicationId: { $in: applicationIds } });
    await Interview.deleteMany({ organizationId: req.actor.organizationId, $or: [{ jobId: job._id }, { applicationId: { $in: applicationIds } }] });
    await ScreeningResult.deleteMany({ organizationId: req.actor.organizationId, $or: [{ jobId: job._id }, { applicationId: { $in: applicationIds } }] });
    await RecruitmentActivity.deleteMany({ organizationId: req.actor.organizationId, $or: [{ entityType: "job", entityId: String(job._id) }, { entityType: "application", entityId: { $in: applicationIds.map(String) } }, { entityType: "screening", entityId: { $in: screeningIds } }, { entityType: "interview", entityId: { $in: interviewIds } }] });
    await Application.deleteMany({ organizationId: req.actor.organizationId, jobId: job._id });
    await removeOrphanedCandidates();
    const deletion = await Job.deleteOne(filter);
    if (!deletion.deletedCount) throw Object.assign(new Error("Job not found."), { statusCode: 404 });
  }

  if (resumeKeys.length) {
    const uploadPath = fileURLToPath(new URL("../../private-uploads/", import.meta.url));
    let cleanupWarnings = 0;
    for (const key of resumeKeys.filter((item) => path.basename(item) === item)) {
      const [applicationReference, screeningReference, candidateReference] = await Promise.all([
        Application.exists({ "resumeDocument.storageKey": key }),
        ScreeningResult.exists({ "resumeFile.storageKey": key }),
        Candidate.exists({ "resumeFiles.storageKey": key })
      ]);
      if (!applicationReference && !screeningReference && !candidateReference) await fs.unlink(path.join(uploadPath, key)).catch((error) => { if (error.code !== "ENOENT") { cleanupWarnings += 1; console.error("Private resume cleanup failed after job deletion.", error.code || error.name); } });
    }
    if (cleanupWarnings) console.error(`Job ${String(job._id)} was removed, but ${cleanupWarnings} unreferenced private resume file(s) need cleanup.`);
  }
  await logActivity(req.actor, "permanently deleted job opening", "job", job._id, { title: job.title, removedApplications: applications.length });
  res.json({ success: true, jobId: String(job._id), removedApplications: applications.length, removedCandidates });
} catch (error) { next(error); } });
jobsRouter.post("/:jobId/analyze", requireAdminOrExecutive, async (req, res, next) => { try { const job = await Job.findOne({ _id: req.params.jobId, organizationId: req.actor.organizationId }); if (!job) return res.status(404).json({ error: "Job not found." }); const profile = await analyzeJob(job.description); job.aiJobProfile = profile; job.aiProfileReviewedAt = null; await job.save(); await logActivity(req.actor, "analyzed job description", "job", job._id, { title: job.title }); res.json({ job, profile }); } catch (error) { next(error); } });
