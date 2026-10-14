import { Router } from "express";
import { Application } from "../models/application.js";
import { Candidate } from "../models/candidate.js";
import { Job } from "../models/job.js";
import { logActivity } from "../services/activity.js";

export const applicationsRouter = Router();
const stages = new Set(["applied", "resume_processing", "awaiting_review", "shortlisted", "interview_scheduled", "interview_completed", "decision_pending", "offer_extended", "offer_accepted", "hired", "not_selected"]);
applicationsRouter.get("/", async (req, res, next) => { try { const filter = { organizationId: req.actor.organizationId, ...(req.query.jobId ? { jobId: req.query.jobId } : {}), ...(req.query.status ? { status: req.query.status } : {}) }; res.json({ items: await Application.find(filter).populate("candidateId", "fullName email location").populate("jobId", "title department").sort({ updatedAt: -1 }).lean() }); } catch (error) { next(error); } });
applicationsRouter.post("/", async (req, res, next) => { try {
  const { candidateId, jobId } = req.body; const [candidate, job] = await Promise.all([Candidate.findOne({ _id: candidateId, organizationId: req.actor.organizationId }), Job.findOne({ _id: jobId, organizationId: req.actor.organizationId })]);
  if (!candidate || !job) return res.status(400).json({ error: "Candidate or job was not found in this organization." });
  const application = await Application.create({ organizationId: req.actor.organizationId, candidateId, jobId, assignedRecruiter: { id: req.actor.id, name: req.actor.name }, statusHistory: [{ status: "awaiting_review", actor: { id: req.actor.id, name: req.actor.name } }] });
  await logActivity(req.actor, "created application", "application", application._id, { candidateId, jobId }); res.status(201).json(application);
} catch (error) { next(error); } });
applicationsRouter.patch("/:applicationId/status", async (req, res, next) => { try { const { status, note = "" } = req.body; if (!stages.has(status)) return res.status(400).json({ error: "Invalid recruitment stage." }); const application = await Application.findOne({ _id: req.params.applicationId, organizationId: req.actor.organizationId }); if (!application) return res.status(404).json({ error: "Application not found." }); application.status = status; application.statusHistory.push({ status, note, actor: { id: req.actor.id, name: req.actor.name } }); await application.save(); await logActivity(req.actor, "changed application status", "application", application._id, { status }); res.json(application); } catch (error) { next(error); } });
