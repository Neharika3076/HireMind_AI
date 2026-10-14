import { Router } from "express";
import { Job } from "../models/job.js";
import { Application } from "../models/application.js";
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
  const applicationCounts = await Application.aggregate([{ $match: { organizationId: req.actor.organizationId, jobId: { $in: ids } } }, { $group: { _id: "$jobId", applicants: { $sum: 1 }, screened: { $sum: { $cond: [{ $ne: ["$status", "applied"] }, 1, 0] } } } }]);
  const counts = new Map(applicationCounts.map((item) => [String(item._id), item]));
  res.json({ items: jobs.map((job) => ({ ...job, metrics: counts.get(String(job._id)) || { applicants: 0, screened: 0 } })), total, page: Number(page), limit: Number(limit) });
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
jobsRouter.delete("/:jobId", requireAdmin, async (req, res, next) => { try { const job = await Job.findOneAndUpdate({ _id: req.params.jobId, organizationId: req.actor.organizationId, status: { $ne: "archived" } }, { status: "archived", updatedBy: { id: req.actor.id, name: req.actor.name } }, { new: true }); if (!job) return res.status(404).json({ error: "Job not found." }); await logActivity(req.actor, "removed job opening", "job", job._id, { title: job.title }); res.json({ success: true, jobId: job._id }); } catch (error) { next(error); } });
jobsRouter.post("/:jobId/analyze", requireAdminOrExecutive, async (req, res, next) => { try { const job = await Job.findOne({ _id: req.params.jobId, organizationId: req.actor.organizationId }); if (!job) return res.status(404).json({ error: "Job not found." }); const profile = await analyzeJob(job.description); job.aiJobProfile = profile; job.aiProfileReviewedAt = null; await job.save(); await logActivity(req.actor, "analyzed job description", "job", job._id, { title: job.title }); res.json({ job, profile }); } catch (error) { next(error); } });
