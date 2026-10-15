import axios from "axios";
import FormData from "form-data";
import fs from "node:fs";
import { config } from "../config.js";

const client = axios.create({ baseURL: config.hireMindBaseUrl, timeout: 120_000 });

function serviceError(error, action) {
  if (error.code === "ECONNREFUSED" || error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return new Error(`HireMind AI did not respond while trying to ${action}. Confirm the FastAPI service is running at ${config.hireMindBaseUrl} and retry.`);
  }

  const status = error.response?.status;
  if (status === 422) {
    const rejection = new Error(String(error.response?.data?.detail || "This file does not appear to be a readable resume. Upload a PDF or DOCX CV with your contact information and work or education history."));
    rejection.statusCode = 422;
    return rejection;
  }
  if (status === 400 || status === 413) {
    return new Error("HireMind AI rejected this resume. Confirm it is a readable, unlocked PDF or DOCX under 5 MB. Scanned image-only PDFs need OCR before they can be screened.");
  }
  if (status >= 500) {
    console.error(`HireMind AI returned HTTP ${status} while trying to ${action}. Check the FastAPI terminal for the internal cause.`);
    const detail = error.response?.data?.detail;
    const message = typeof detail === "string" && detail.trim()
      ? detail.trim()
      : `HireMind AI encountered an internal error while trying to ${action}. Check the FastAPI terminal for details, then retry.`;
    const upstreamError = new Error(message);
    upstreamError.statusCode = 502;
    upstreamError.expose = true;
    return upstreamError;
  }

  console.error(`HireMind AI request failed while trying to ${action} (${error.code || "unknown error"}).`);
  return new Error(`HireMind AI could not ${action}. Check the FastAPI service and retry.`);
}

export async function healthCheck() {
  try { return (await client.get("/health")).data; }
  catch (error) { throw serviceError(error, "check its health"); }
}

export async function analyzeJob(description) {
  try {
    const response = await client.post("/api/job/analyze", { job_description: description });
    if (!response.data?.success || !response.data?.profile) throw new Error("Invalid AI job-analysis response");
    return response.data.profile;
  } catch (error) { throw serviceError(error, "analyze this job description"); }
}

export async function extractResume(file) {
  const form = new FormData();
  form.append("file", fs.createReadStream(file.path), { filename: file.originalname, contentType: file.mimetype });
  try {
    const response = await client.post("/api/resume/extract", form, { headers: form.getHeaders(), maxBodyLength: 10 * 1024 * 1024 });
    if (!response.data?.success || !response.data?.profile) throw new Error("Invalid AI resume-extraction response");
    return response.data;
  } catch (error) { throw serviceError(error, "extract this resume"); }
}

export async function matchCandidate(resume, job) {
  try {
    const response = await client.post("/api/ats/match", { resume, job });
    if (!response.data?.success || !response.data?.result) throw new Error("Invalid AI matching response");
    return response.data.result;
  } catch (error) { throw serviceError(error, "match this candidate"); }
}
