import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { config } from "../src/config.js";
import { Application } from "../src/models/application.js";
import { Candidate } from "../src/models/candidate.js";
import { ScreeningResult } from "../src/models/screening-result.js";

const apply = process.argv.includes("--apply");
const uploadPath = fileURLToPath(new URL("../private-uploads/", import.meta.url));
let linked = 0;
let ambiguous = 0;
let missingFiles = 0;

try {
  await mongoose.connect(config.mongoUri);
  const applications = await Application.find({ $or: [{ resumeDocument: { $exists: false } }, { "resumeDocument.storageKey": { $exists: false } }] }).lean();
  for (const application of applications) {
    const rows = await ScreeningResult.find({
      applicationId: application._id,
      organizationId: application.organizationId,
      jobId: application.jobId,
      candidateId: application.candidateId,
      "resumeFile.storageKey": { $type: "string", $ne: "" }
    }).select("resumeFile createdAt").lean();
    const byKey = new Map(rows.map((row) => [row.resumeFile.storageKey, row]));
    if (byKey.size !== 1) { if (byKey.size > 1) ambiguous += 1; continue; }
    const [storageKey, screening] = [...byKey.entries()][0];
    if (path.basename(storageKey) !== storageKey) { ambiguous += 1; continue; }
    const filePath = path.join(uploadPath, storageKey);
    try { await fs.access(filePath); } catch { missingFiles += 1; continue; }
    const candidate = await Candidate.findOne({ _id: application.candidateId, organizationId: application.organizationId }).select("resumeFiles").lean();
    const sharedMetadata = candidate?.resumeFiles?.find((item) => item.storageKey === storageKey);
    const extension = path.extname(storageKey).toLowerCase();
    const mimeType = sharedMetadata?.mimeType || (extension === ".pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    const resumeDocument = {
      originalName: sharedMetadata?.originalName || screening.resumeFile.originalName || "resume" + extension,
      storageKey,
      mimeType,
      size: sharedMetadata?.size || 0,
      uploadedAt: sharedMetadata?.uploadedAt || screening.createdAt
    };
    console.log(`${apply ? "Link" : "Would link"} application ${application._id} to its exact screening document.`);
    if (apply) {
      const result = await Application.updateOne({ _id: application._id, organizationId: application.organizationId, "resumeDocument.storageKey": { $exists: false } }, { $set: { resumeDocument } });
      if (result.modifiedCount) linked += 1;
    }
  }
  console.log(JSON.stringify({ mode: apply ? "applied" : "dry-run", candidatesChecked: applications.length, linked, ambiguousNeedsManualReview: ambiguous, missingFiles }, null, 2));
} catch (error) {
  console.error("Resume-document migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
