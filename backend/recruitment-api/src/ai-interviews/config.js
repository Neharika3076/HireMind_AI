import crypto from "node:crypto";

export const interviewConfig = {
  groqApiKey: process.env.GROQ_INTERVIEW_API_KEY || process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_INTERVIEW_MODEL || process.env.GROQ_MODEL || "openai/gpt-oss-20b",
  groqBaseUrl: (process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, ""),
  maxQuestions: 8,
  maxFollowUps: 2,
  answerMaxChars: 5000,
  defaultInviteDays: 7,
  maxInviteDays: 30,
  retentionDays: Math.max(30, Number(process.env.AI_INTERVIEW_RETENTION_DAYS || 90))
};

export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
export const randomSecret = () => crypto.randomBytes(32).toString("base64url");

export const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM || "talent@example.com"
};