import { Router } from "express";
import { Candidate } from "../models/candidate.js";
import { Application } from "../models/application.js";
import { ScreeningResult } from "../models/screening-result.js";

export const candidatesRouter = Router();
candidatesRouter.get("/", async (req, res, next) => { try {
  const { search = "", page = 1, limit = 20 } = req.query;
  // The Candidates view represents active recruitment candidates. A rejected
  // or not-selected application should not keep a person in this list unless
  // they still have another active application in this organization.
  const activeCandidateIds = await Application.distinct("candidateId", {
    organizationId: req.actor.organizationId,
    status: { $nin: ["rejected", "not_selected"] }
  });
  const filter = { organizationId: req.actor.organizationId, _id: { $in: activeCandidateIds.filter(Boolean) } };
  if (search) filter.$or = [{ fullName: new RegExp(String(search), "i") }, { email: new RegExp(String(search), "i") }, { "profile.skills.name": new RegExp(String(search), "i") }];
  const [items, total] = await Promise.all([Candidate.find(filter).select("-resumeFiles -accountId").sort({ updatedAt: -1 }).skip((Number(page) - 1) * Number(limit)).limit(Number(limit)).lean(), Candidate.countDocuments(filter)]);
  const counts = await Application.aggregate([{ $match: { organizationId: req.actor.organizationId, candidateId: { $in: items.map((item) => item._id) }, status: { $nin: ["rejected", "not_selected"] } } }, { $group: { _id: "$candidateId", count: { $sum: 1 } } }]);
  const countByCandidate = new Map(counts.map((item) => [String(item._id), item.count]));
  res.json({ items: items.map((item) => ({ ...item, applicationCount: countByCandidate.get(String(item._id)) || 0 })), total, page: Number(page), limit: Number(limit) });
} catch (error) { next(error); } });

candidatesRouter.get("/:candidateId", async (req, res, next) => { try {
  const candidate = await Candidate.findOne({ _id: req.params.candidateId, organizationId: req.actor.organizationId }).select("-resumeFiles -accountId").lean();
  if (!candidate) return res.status(404).json({ error: "Candidate not found." });
  const [applications, screening] = await Promise.all([Application.find({ candidateId: candidate._id, organizationId: req.actor.organizationId }).select("-candidateAccountId -resumeDocument.storageKey").populate({ path: "jobId", match: { organizationId: req.actor.organizationId }, select: "title department companyName" }).lean(), ScreeningResult.find({ candidateId: candidate._id, organizationId: req.actor.organizationId }).select("-resumeFile.storageKey").sort({ createdAt: -1 }).lean()]);
  res.json({ candidate, applications: applications.filter((application) => application.jobId), screening });
} catch (error) { next(error); } });

candidatesRouter.patch("/:candidateId", async (req, res, next) => { try {
  const allowed = ["phone", "location", "professionalSummary", "notes"];
  const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  const candidate = await Candidate.findOneAndUpdate({ _id: req.params.candidateId, organizationId: req.actor.organizationId }, update, { new: true, runValidators: true }).select("-resumeFiles -accountId");
  if (!candidate) return res.status(404).json({ error: "Candidate not found." }); res.json(candidate);
} catch (error) { next(error); } });
