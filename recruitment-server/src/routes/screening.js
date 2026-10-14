import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { Job } from "../models/job.js";
import { Candidate } from "../models/candidate.js";
import { Application } from "../models/application.js";
import { ScreeningResult } from "../models/screening-result.js";
import { extractResume, matchCandidate } from "../services/hiremind-client.js";
import { logActivity } from "../services/activity.js";

export const screeningRouter = Router();
const uploadPath = fileURLToPath(new URL("../../private-uploads/", import.meta.url));
const storage = multer.diskStorage({ destination: (_req, _file, done) => done(null, uploadPath), filename: (_req, file, done) => done(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname).toLowerCase()}`) });
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024, files: 10 }, fileFilter: (_req, file, done) => [".pdf", ".docx"].includes(path.extname(file.originalname).toLowerCase()) ? done(null, true) : done(Object.assign(new Error("Only PDF and DOCX resume files are supported."), { statusCode: 400 })) });

async function hasSupportedSignature(file) {
  const handle = await fs.open(file.path, "r");
  try { const buffer = Buffer.alloc(4); await handle.read(buffer, 0, 4, 0); const signature = buffer.toString("ascii"); return path.extname(file.originalname).toLowerCase() === ".pdf" ? signature === "%PDF" : signature.startsWith("PK"); }
  finally { await handle.close(); }
}

function candidateData(profile, file, actor) { const person = profile.candidate || {}; return { organizationId: actor.organizationId, fullName: String(person.name || "Not provided"), email: String(person.email || "").toLowerCase(), phone: String(person.phone || ""), location: String(person.location || ""), professionalSummary: String(profile.professional_summary || ""), profile, resumeFiles: [{ originalName: file.originalname, storageKey: file.filename, mimeType: file.mimetype, size: file.size, uploadedAt: new Date() }] }; }

screeningRouter.post("/jobs/:jobId", upload.array("resumes", 10), async (req, res, next) => { try {
  const job = await Job.findOne({ _id: req.params.jobId, organizationId: req.actor.organizationId }); if (!job) return res.status(404).json({ error: "Job not found." });
  if (!req.files?.length) return res.status(400).json({ error: "Upload at least one PDF or DOCX resume." });
  const jobProfile = job.aiJobProfile || { title: job.title, summary: job.description, skills: [...job.requiredSkills.map((name) => ({ name, required: true })), ...job.preferredSkills.map((name) => ({ name, required: false }))], experience: { minimum_years: job.minimumExperience, preferred_years: job.preferredExperience }, education: job.educationRequirements.map((degree) => ({ degree, required: true })), responsibilities: job.responsibilities, certifications: job.certifications.map((name) => ({ name, required: false })) };
  const results = [];
  for (const file of req.files) {
    let screening; try {
      if (!await hasSupportedSignature(file)) throw new Error("The uploaded file content does not match a supported PDF or DOCX resume.");
      const extraction = await extractResume(file); const candidateInfo = candidateData(extraction.profile, file, req.actor);
      const existingCandidates = await Candidate.find({ organizationId: req.actor.organizationId }).select("fullName email phone").lean();
      const phoneKey = String(candidateInfo.phone || "").replace(/\D/g, "");
      const emailKey = String(candidateInfo.email || "").trim().toLowerCase();
      const nameKey = String(candidateInfo.fullName || "").trim().replace(/\s+/g, " ").toLowerCase();
      let candidate = (phoneKey && existingCandidates.find((person) => String(person.phone || "").replace(/\D/g, "") === phoneKey))
        || (emailKey && existingCandidates.find((person) => String(person.email || "").trim().toLowerCase() === emailKey))
        || (nameKey && nameKey !== "not provided" && existingCandidates.find((person) => String(person.fullName || "").trim().replace(/\s+/g, " ").toLowerCase() === nameKey));
      if (candidate) { candidate.profile = candidateInfo.profile; candidate.professionalSummary = candidateInfo.professionalSummary; candidate.resumeFiles.push(candidateInfo.resumeFiles[0]); await candidate.save(); } else candidate = await Candidate.create(candidateInfo);
      let application = await Application.findOne({ organizationId: req.actor.organizationId, candidateId: candidate._id, jobId: job._id });
      if (!application) application = await Application.create({ organizationId: req.actor.organizationId, candidateId: candidate._id, jobId: job._id, assignedRecruiter: { id: req.actor.id, name: req.actor.name }, status: "awaiting_review", statusHistory: [{ status: "awaiting_review", actor: { id: req.actor.id, name: req.actor.name }, note: "Resume processed" }] });
      screening = await ScreeningResult.create({ organizationId: req.actor.organizationId, applicationId: application._id, jobId: job._id, candidateId: candidate._id, resumeFile: { originalName: file.originalname, storageKey: file.filename }, status: "processing" });
      const match = await matchCandidate(extraction.profile, jobProfile); screening.status = "completed"; screening.result = match; screening.analyzedAt = new Date(); await screening.save();
      await logActivity(req.actor, "screened resume", "screening", screening._id, { jobId: String(job._id), candidateId: String(candidate._id) }); results.push({ file: file.originalname, status: "completed", candidateId: candidate._id, applicationId: application._id, result: match });
    } catch (error) { screening = await ScreeningResult.create({ organizationId: req.actor.organizationId, jobId: job._id, candidateId: null, applicationId: null, resumeFile: { originalName: file.originalname, storageKey: file.filename }, status: "failed", failureCategory: "processing", failureMessage: error.message }); results.push({ file: file.originalname, status: "failed", error: "This resume could not be processed. You may retry it." }); }
  }
  res.status(201).json({ jobId: job._id, results });
} catch (error) { next(error); } });

screeningRouter.get("/jobs/:jobId", async (req, res, next) => { try { const job = await Job.findOne({ _id: req.params.jobId, organizationId: req.actor.organizationId }); if (!job) return res.status(404).json({ error: "Job not found." }); const items = await ScreeningResult.find({ jobId: job._id, organizationId: req.actor.organizationId }).populate("candidateId", "fullName email location").populate("applicationId", "status").sort({ createdAt: -1 }).lean(); res.json({ items }); } catch (error) { next(error); } });
