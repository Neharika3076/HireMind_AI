import { Router } from "express";
import { Job } from "../models/job.js";
import { Candidate } from "../models/candidate.js";
import { Application } from "../models/application.js";
import { Interview } from "../models/interview.js";
import { RecruitmentActivity } from "../models/activity.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", async (req, res, next) => {
  try {
    const organizationId = req.actor.organizationId;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [activeJobs, totalCandidates, newApplications, awaitingReview, scheduledInterviews, completedInterviews, offers, recentActivity] = await Promise.all([
      Job.countDocuments({ organizationId, status: "published" }),
      Candidate.countDocuments({ organizationId }),
      Application.countDocuments({ organizationId, createdAt: { $gte: sevenDaysAgo } }),
      Application.countDocuments({ organizationId, status: { $in: ["awaiting_review", "shortlisted"] } }),
      Interview.countDocuments({ organizationId, status: "scheduled" }),
      Interview.countDocuments({ organizationId, status: "completed" }),
      Application.countDocuments({ organizationId, status: { $in: ["offer_extended", "offer_accepted"] } }),
      RecruitmentActivity.find({ organizationId }).sort({ createdAt: -1 }).limit(10).lean()
    ]);
    res.json({ metrics: { activeJobs, totalCandidates, newApplications, awaitingReview, scheduledInterviews, completedInterviews, offers }, recentActivity });
  } catch (error) { next(error); }
});
