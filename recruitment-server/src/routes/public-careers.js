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
import { CandidateAccount } from "../models/candidate-account.js";
import { analyzeJob, extractResume, matchCandidate } from "../services/hiremind-client.js";
import { logActivity } from "../services/activity.js";
import { buildAtsJobProfile } from "../services/job-profile.js";
import { hashCandidatePassword, verifyCandidatePassword } from "../services/candidate-password.js";
import { getApplicationDeadlineStart } from "../utils/application-deadline.js";

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

async function findCandidate({ organizationId, phone, email, fullName, accountId }) {
  const people = await Candidate.find({ organizationId }).select("fullName email phone accountId").lean();
  const phoneKey = normalizePhone(phone);
  const emailKey = normalizeEmail(email);
  const nameKey = normalizeName(fullName);
  const linkedPeople = await Candidate.find({ organizationId, accountId }).select("_id fullName email phone").lean();
  return linkedPeople[0]
    || (emailKey && people.find((person) => normalizeEmail(person.email) === emailKey && (!person.accountId || String(person.accountId) === String(accountId))))
    || (phoneKey && people.find((person) => normalizePhone(person.phone) === phoneKey && !person.accountId))
    || (nameKey && people.find((person) => normalizeName(person.fullName) === nameKey && !person.accountId))
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
  preferredSkills: job.preferredSkills, educationRequirements: job.educationRequirements, certifications: job.certifications, minimumExperience: job.minimumExperience,
  preferredExperience: job.preferredExperience, openings: job.openings, applicationDeadline: job.applicationDeadline
});

publicCareersRouter.get("/jobs", async (_req, res, next) => {
  try {
    const jobs = await Job.find({ status: "published", $or: [{ applicationDeadline: null }, { applicationDeadline: { $gte: getApplicationDeadlineStart() } }] })
      .select("companyName title department employmentType workArrangement location description responsibilities requiredSkills preferredSkills educationRequirements certifications minimumExperience preferredExperience openings applicationDeadline createdAt")
      .sort({ createdAt: -1 }).lean();
    res.json({ items: jobs.map(publicJob) });
  } catch (error) { next(error); }
});

publicCareersRouter.get("/jobs/:jobId", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.jobId)) return res.status(404).json({ error: "This job opening is no longer available." });
    const job = await Job.findOne({ _id: req.params.jobId, status: "published", $or: [{ applicationDeadline: null }, { applicationDeadline: { $gte: getApplicationDeadlineStart() } }] }).lean();
    if (!job) return res.status(404).json({ error: "This job opening is no longer available." });
    res.json({ job: publicJob(job) });
  } catch (error) { next(error); }
});

publicCareersRouter.post("/candidate/applications", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || password.length > 128) return res.status(400).json({ error: "Enter a valid email and the 8–128 character password you used when applying." });
    const account = await CandidateAccount.findOne({ email }).select("+passwordSalt +passwordHash fullName");
    if (!account || !await verifyCandidatePassword(password, account.passwordSalt, account.passwordHash)) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }
    const applications = await Application.find({ candidateAccountId: account._id })
      .populate({ path: "jobId", select: "title companyName department" })
      .sort({ appliedAt: -1 }).lean();
    res.json({ items: applications.map((application) => ({
      applicationId: String(application._id), status: application.status, appliedAt: application.appliedAt,
      job: application.jobId ? { title: application.jobId.title, companyName: application.jobId.companyName, department: application.jobId.department } : null
    })) });
  } catch (error) { next(error); }
});

publicCareersRouter.post("/jobs/:jobId/applications", upload.single("resume"), async (req, res, next) => {
  let file = req.file;
  try {
    if (!mongoose.isValidObjectId(req.params.jobId)) return res.status(404).json({ error: "This job opening is no longer available." });
    const job = await Job.findOne({ _id: req.params.jobId, status: "published", $or: [{ applicationDeadline: null }, { applicationDeadline: { $gte: getApplicationDeadlineStart() } }] });
    if (!job) return res.status(404).json({ error: "This job opening is no longer available." });
    const fullName = String(req.body.fullName || "").trim().replace(/\s+/g, " ");
    const email = normalizeEmail(req.body.email);
    const phone = String(req.body.phone || "").trim();
    const location = String(req.body.location || "").trim();
    const address = String(req.body.address || "").trim();
    const note = String(req.body.note || "").trim();
    const password = String(req.body.password || "");
    if (!fullName || !/^\S+@\S+\.\S+$/.test(email) || normalizePhone(phone).length < 7) return res.status(400).json({ error: "Enter your full name, a valid email address, and a phone number with at least 7 digits." });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: "Create an application-history password between 8 and 128 characters." });
    if (!file) return res.status(400).json({ error: "Choose a PDF or DOCX resume to apply." });
    if (!await validFileSignature(file)) return res.status(400).json({ error: "The file content does not match its PDF or DOCX extension. Please choose your actual resume." });

    let account = await CandidateAccount.findOne({ email }).select("+passwordSalt +passwordHash");
    if (account && !await verifyCandidatePassword(password, account.passwordSalt, account.passwordHash)) {
      return res.status(401).json({ error: "An account already uses this email. Enter its password to continue." });
    }

    // A candidate account is global, while candidate profile records remain
    // tenant-local so one employer never reads another employer's private data.
    if (!account) {
      const credentials = await hashCandidatePassword(password);
      try {
        account = await CandidateAccount.create({ email, passwordSalt: credentials.salt, passwordHash: credentials.hash, fullName, phone });
      } catch (error) {
        if (error.code !== 11000) throw error;
        account = await CandidateAccount.findOne({ email }).select("+passwordSalt +passwordHash");
        if (!account || !await verifyCandidatePassword(password, account.passwordSalt, account.passwordHash)) return res.status(401).json({ error: "An account already uses this email. Enter its password to continue." });
      }
    }

    const existing = await findCandidate({ organizationId: job.organizationId, phone, email, fullName, accountId: account._id });
    if (await Application.exists({ organizationId: job.organizationId, candidateAccountId: account._id, jobId: job._id })
      || (existing && await Application.exists({ organizationId: job.organizationId, candidateId: existing._id, jobId: job._id }))) {
      return res.status(409).json({ error: "An application from you is already recorded for this opening." });
    }

    // Extraction validates that this is a readable resume before we create an applicant record.
    const extraction = await extractResume(file);
    const stillAccepting = await Job.exists({ _id: job._id, organizationId: job.organizationId, status: "published", $or: [{ applicationDeadline: null }, { applicationDeadline: { $gte: getApplicationDeadlineStart() } }] });
    if (!stillAccepting) return res.status(409).json({ error: "This opening stopped accepting applications while your resume was being checked." });
    const person = extraction.profile?.candidate || {};
    const profile = {
      ...extraction.profile,
      candidate: { ...person, name: fullName, email, phone, location: location || person.location || "" }
    };
    const actor = { organizationId: job.organizationId, id: "candidate", name: fullName };
    const resumeFile = { originalName: file.originalname, storageKey: file.filename, mimeType: file.mimetype, size: file.size, uploadedAt: new Date() };
    let candidate = existing ? await Candidate.findOne({ _id: existing._id, organizationId: job.organizationId }) : null;
    if (candidate) {
      candidate.accountId = account._id;
      candidate.fullName = fullName;
      candidate.email = email;
      candidate.phone = phone;
      candidate.location = location || candidate.location;
      candidate.address = address;
      candidate.profile = profile;
      candidate.professionalSummary = String(profile.professional_summary || "");
      await candidate.save();
    } else {
      candidate = await Candidate.create({ organizationId: job.organizationId, accountId: account._id, fullName, email, phone, location, address, profile, professionalSummary: String(profile.professional_summary || "") });
    }

    let application;
    try {
      application = await Application.create({
        organizationId: job.organizationId, candidateId: candidate._id, candidateAccountId: account._id, jobId: job._id,
        resumeDocument: resumeFile,
        applicationNote: note, status: "awaiting_review",
        statusHistory: [{ status: "awaiting_review", actor: { id: "candidate", name: fullName }, note: "Candidate applied through the public job openings page" }]
      });
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ error: "An application from you is already recorded for this opening." });
      throw error;
    }
    file = null; // The accepted resume is now referenced by this application.

    const screening = await ScreeningResult.create({ organizationId: job.organizationId, applicationId: application._id, jobId: job._id, candidateId: candidate._id, resumeFile: { originalName: resumeFile.originalName, storageKey: resumeFile.storageKey }, status: "processing" });
    try {
      // Older published jobs may not have been analyzed yet. Analyze lazily
      // before ATS matching so blank form fields are inferred from the job
      // description instead of being treated as missing requirements.
      if (!job.aiJobProfile || !job.aiProfileReviewedAt) {
        job.aiJobProfile = await analyzeJob(job.description);
        job.aiProfileReviewedAt = new Date();
        await job.save();
      }
      const jobProfile = buildAtsJobProfile(job);
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
  } catch (error) {
    next(error);
  } finally {
    if (file?.path) await fs.unlink(file.path).catch(() => {});
  }
});
