import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import mongoose from "mongoose";
import { Job } from "../models/job.js";
import { Candidate } from "../models/candidate.js";
import { Application } from "../models/application.js";
import { ScreeningResult } from "../models/screening-result.js";
import { extractResume, matchCandidate } from "../services/hiremind-client.js";
import { logActivity } from "../services/activity.js";

export const publicCareersRouter = Router();
const uploadPath = fileURLToPath(new URL("../../private-uploads/", import.meta.url));
const storage = multer.diskStorage({
  destination: (_req, _file, done) => done(null, uploadPath),
  filename: (_req, file, done) => done(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname).toLowerCase()}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, done) => [".pdf", ".docx"].includes(path.extname(file.originalname).toLowerCase())
    ? done(null, true)
    : done(Object.assign(new Error("Upload your resume as a PDF or DOCX file."), { statusCode: 400 }))
});

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
const normalizeName = (value) => String(value || "").trim().replace(/\s+/g, " ").toLowerCase();

async function findCandidate({ organizationId, phone, email, fullName }) {
  const people = await Candidate.find({ organizationId }).select("fullName email phone").lean();
  const phoneKey = normalizePhone(phone);
  const emailKey = normalizeEmail(email);
  const nameKey = normalizeName(fullName);
  return (phoneKey && people.find((person) => normalizePhone(person.phone) === phoneKey))
    || (emailKey && people.find((person) => normalizeEmail(person.email) === emailKey))
    || (nameKey && people.find((person) => normalizeName(person.fullName) === nameKey))
    || null;
}

async function validFileSignature(file) {
  const handle = await fs.open(file.path, "r");
  try {
    const buffer = Buffer.alloc(4);
    await handle.read(buffer, 0, 4, 0);
    const signature = buffer.toString("ascii");
    return path.extname(file.originalname).toLowerCase() === ".pdf" ? signature === "%PDF" : signature.startsWith("PK");
  } finally { await handle.close(); }
}

const publicJob = (job) => ({
  id: String(job._id), companyName: job.companyName || "Organization", title: job.title, department: job.department,
  employmentType: job.employmentType, workArrangement: job.workArrangement, location: job.location,
  description: job.description, responsibilities: job.responsibilities, requiredSkills: job.requiredSkills,
  preferredSkills: job.preferredSkills, minimumExperience: job.minimumExperience,
  preferredExperience: job.preferredExperience, openings: job.openings, applicationDeadline: job.applicationDeadline
});

publicCareersRouter.get("/jobs", async (_req, res, next) => {
  try {
    const now = new Date();
    const jobs = await Job.find({ status: "published", $or: [{ applicationDeadline: null }, { applicationDeadline: { $gte: now } }] })
      .select("companyName title department employmentType workArrangement location description responsibilities requiredSkills preferredSkills minimumExperience preferredExperience openings applicationDeadline createdAt")
      .sort({ createdAt: -1 }).lean();
    res.json({ items: jobs.map(publicJob) });
  } catch (error) { next(error); }
});

publicCareersRouter.get("/jobs/:jobId", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.jobId)) return res.status(404).json({ error: "This job opening is no longer available." });
    const job = await Job.findOne({ _id: req.params.jobId, status: "published", $or: [{ applicationDeadline: null }, { applicationDeadline: { $gte: new Date() } }] }).lean();
    if (!job) return res.status(404).json({ error: "This job opening is no longer available." });
    res.json({ job: publicJob(job) });
  } catch (error) { next(error); }
});

publicCareersRouter.post("/jobs/:jobId/applications", upload.single("resume"), async (req, res, next) => {
  let file = req.file;
  try {
    if (!mongoose.isValidObjectId(req.params.jobId)) return res.status(404).json({ error: "This job opening is no longer available." });
    const job = await Job.findOne({ _id: req.params.jobId, status: "published", $or: [{ applicationDeadline: null }, { applicationDeadline: { $gte: new Date() } }] });
    if (!job) return res.status(404).json({ error: "This job opening is no longer available." });
    const fullName = String(req.body.fullName || "").trim().replace(/\s+/g, " ");
    const email = normalizeEmail(req.body.email);
    const phone = String(req.body.phone || "").trim();
    const location = String(req.body.location || "").trim();
    const address = String(req.body.address || "").trim();
    const note = String(req.body.note || "").trim();
    if (!fullName || !/^\S+@\S+\.\S+$/.test(email) || normalizePhone(phone).length < 7) return res.status(400).json({ error: "Enter your full name, a valid email address, and a phone number with at least 7 digits." });
    if (!file) return res.status(400).json({ error: "Choose a PDF or DOCX resume to apply." });
    if (!await validFileSignature(file)) return res.status(400).json({ error: "The file content does not match its PDF or DOCX extension. Please choose your actual resume." });

    const existing = await findCandidate({ organizationId: job.organizationId, phone, email, fullName });
    if (existing && await Application.exists({ organizationId: job.organizationId, candidateId: existing._id, jobId: job._id })) {
      return res.status(409).json({ error: "An application from you is already recorded for this opening." });
    }

    // Extraction validates that this is a readable resume before we create an applicant record.
    const extraction = await extractResume(file);
    const person = extraction.profile?.candidate || {};
    const profile = {
      ...extraction.profile,
      candidate: { ...person, name: fullName, email, phone, location: location || person.location || "" }
    };
    const actor = { organizationId: job.organizationId, id: "candidate", name: fullName };
    const resumeFile = { originalName: file.originalname, storageKey: file.filename, mimeType: file.mimetype, size: file.size, uploadedAt: new Date() };
    let candidate = existing ? await Candidate.findById(existing._id) : null;
    if (candidate) {
      candidate.fullName = fullName;
      candidate.email = email;
      candidate.phone = phone;
      candidate.location = location || candidate.location;
      candidate.address = address;
      candidate.profile = profile;
      candidate.professionalSummary = String(profile.professional_summary || "");
      candidate.resumeFiles.push(resumeFile);
      await candidate.save();
    } else {
      candidate = await Candidate.create({ organizationId: job.organizationId, fullName, email, phone, location, address, profile, professionalSummary: String(profile.professional_summary || ""), resumeFiles: [resumeFile] });
    }

    let application;
    try {
      application = await Application.create({
        organizationId: job.organizationId, candidateId: candidate._id, jobId: job._id,
        applicationNote: note, status: "awaiting_review",
        statusHistory: [{ status: "awaiting_review", actor: { id: "candidate", name: fullName }, note: "Candidate applied through the public job openings page" }]
      });
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ error: "An application from you is already recorded for this opening." });
      throw error;
    }

    const screening = await ScreeningResult.create({ organizationId: job.organizationId, applicationId: application._id, jobId: job._id, candidateId: candidate._id, resumeFile: { originalName: file.originalname, storageKey: file.filename }, status: "processing" });
    const jobProfile = job.aiJobProfile || { title: job.title, summary: job.description, skills: [...job.requiredSkills.map((name) => ({ name, required: true })), ...job.preferredSkills.map((name) => ({ name, required: false }))], experience: { minimum_years: job.minimumExperience, preferred_years: job.preferredExperience }, education: job.educationRequirements.map((degree) => ({ degree, required: true })), responsibilities: job.responsibilities, certifications: job.certifications.map((name) => ({ name, required: false })) };
    try {
      screening.result = await matchCandidate(profile, jobProfile);
      screening.status = "completed";
      screening.analyzedAt = new Date();
    } catch (error) {
      screening.status = "failed";
      screening.failureCategory = "matching";
      screening.failureMessage = error.message;
    }
    await screening.save();
    await logActivity(actor, "applied for job", "application", application._id, { title: job.title, candidateName: fullName });
    res.status(201).json({ success: true, applicationId: application._id, jobTitle: job.title, screeningStatus: screening.status, candidateName: fullName });
    file = null; // The accepted resume is retained in private storage.
  } catch (error) {
    next(error);
  } finally {
    if (file?.path) await fs.unlink(file.path).catch(() => {});
  }
});
