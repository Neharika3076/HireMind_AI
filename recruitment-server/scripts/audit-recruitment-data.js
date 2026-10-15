import mongoose from "mongoose";
import { config } from "../src/config.js";
import { Job } from "../src/models/job.js";
import { Application } from "../src/models/application.js";
import { Candidate } from "../src/models/candidate.js";
import { ScreeningResult } from "../src/models/screening-result.js";

try {
  await mongoose.connect(config.mongoUri);
  const [archivedJobs, legacyApplications, legacyCandidateHistory, orphanScreenings, candidatesWithSharedResumes] = await Promise.all([
    Job.countDocuments({ status: "archived" }),
    Application.countDocuments({ $or: [{ resumeDocument: { $exists: false } }, { "resumeDocument.storageKey": { $exists: false } }] }),
    Application.countDocuments({ candidateAccountId: { $exists: false } }),
    ScreeningResult.countDocuments({ applicationId: null }),
    Candidate.countDocuments({ "resumeFiles.0": { $exists: true } })
  ]);
  console.log(JSON.stringify({
    database: mongoose.connection.name,
    archivedJobsRequireManualStateReview: archivedJobs,
    applicationsWithoutApplicationResume: legacyApplications,
    applicationsWithoutCandidateAccountForHistory: legacyCandidateHistory,
    unlinkedScreeningRowsRequireManualReview: orphanScreenings,
    candidatesWithLegacySharedResumeFiles: candidatesWithSharedResumes,
    note: "This audit is read-only. It does not guess job status or link applications by title, email, or filename."
  }, null, 2));
} catch (error) {
  console.error("Recruitment data audit failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
