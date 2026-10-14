import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 3001),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hiremind_recruitment",
  hireMindBaseUrl: (process.env.HIREMIND_AI_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, ""),
  allowedOrigin: process.env.ALLOWED_ORIGIN || "http://127.0.0.1:3001",
  uploadDirectory: new URL("../private-uploads/", import.meta.url),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || "talent@example.com"
  }
};
