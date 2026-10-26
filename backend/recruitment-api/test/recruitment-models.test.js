import test from "node:test";
import assert from "node:assert/strict";
import { Job } from "../src/models/job.js";
import { Application } from "../src/models/application.js";
import { hashCandidatePassword, verifyCandidatePassword } from "../src/services/candidate-password.js";

test("new jobs receive unique stable ids and start as drafts even with duplicate titles", () => {
  const first = new Job({ title: "Designer", department: "Product", employmentType: "full-time", workArrangement: "remote", description: "Build product experiences", openings: 1, organizationId: "org-a" });
  const second = new Job({ title: "Designer", department: "Product", employmentType: "full-time", workArrangement: "remote", description: "Build product experiences", openings: 1, organizationId: "org-a" });
  assert.equal(first.status, "draft");
  assert.notEqual(String(first._id), String(second._id));
});

test("application stores its own resume and recruiter decision without changing candidate identity", () => {
  const application = new Application({
    organizationId: "org-a", candidateId: "507f1f77bcf86cd799439011", candidateAccountId: "507f191e810c19729de860ea", jobId: "507f1f77bcf86cd799439012",
    resumeDocument: { originalName: "role-specific.pdf", storageKey: "resume-a.pdf", mimeType: "application/pdf", size: 10 },
    status: "approved", decisionBy: { id: "recruiter-a", name: "Recruiter A" }, decisionAt: new Date()
  });
  assert.equal(application.resumeDocument.storageKey, "resume-a.pdf");
  assert.equal(application.status, "approved");
  assert.equal(application.decisionBy.id, "recruiter-a");
});

test("candidate password hashes are salted and verified", async () => {
  const first = await hashCandidatePassword("correct horse battery");
  const second = await hashCandidatePassword("correct horse battery");
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.hash, second.hash);
  assert.equal(await verifyCandidatePassword("correct horse battery", first.salt, first.hash), true);
  assert.equal(await verifyCandidatePassword("incorrect password", first.salt, first.hash), false);
});
