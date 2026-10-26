import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = fileURLToPath(new URL("../../../", import.meta.url));
dotenv.config({ path: path.join(projectRoot, ".env") });

export const config = {
  port: Number(process.env.PORT || process.env.RECRUITMENT_PORT || 3001),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hiremind_recruitment",
  hireMindBaseUrl: (process.env.HIREMIND_AI_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, ""),
  allowedOrigin: process.env.ALLOWED_ORIGIN || "http://localhost:5173",
  publicAppUrl: process.env.PUBLIC_APP_URL || "",
  uploadDirectory: process.env.UPLOAD_DIRECTORY
    ? pathToFileURL(`${path.resolve(process.env.UPLOAD_DIRECTORY)}${path.sep}`)
    : new URL("../private-uploads/", import.meta.url),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || "talent@example.com"
  }
};
