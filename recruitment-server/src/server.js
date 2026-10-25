import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { requireRecruiter } from "./middleware/auth.js";
import { healthRouter } from "./routes/health.js";
import { jobsRouter } from "./routes/jobs.js";
import { candidatesRouter } from "./routes/candidates.js";
import { applicationsRouter } from "./routes/applications.js";
import { screeningRouter } from "./routes/screening.js";
import { interviewsRouter } from "./routes/interviews.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { emailsRouter } from "./routes/emails.js";
import { publicCareersRouter } from "./routes/public-careers.js";
import { aiInterviewPublicRouter } from "./ai-interviews/routes/public-routes.js";
import { aiInterviewRecruiterRouter } from "./ai-interviews/routes/recruiter-routes.js";

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: (origin, callback) => {
  if (!origin || origin === "null" || origin === config.allowedOrigin) return callback(null, true);
  try {
    const url = new URL(origin);
    const isLocalDevelopment = process.env.NODE_ENV !== "production"
      && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return callback(null, isLocalDevelopment);
  } catch {
    return callback(null, false);
  }
}, credentials: false }));
app.use(express.json({ limit: "1mb" }));
app.use("/api/recruitment/health", healthRouter);
app.use("/api/recruitment/public", publicCareersRouter);
app.use("/api/recruitment/public/ai-interviews", aiInterviewPublicRouter);
app.use("/api/recruitment", requireRecruiter);
app.use("/api/recruitment/dashboard", dashboardRouter);
app.use("/api/recruitment/jobs", jobsRouter);
app.use("/api/recruitment/candidates", candidatesRouter);
app.use("/api/recruitment/applications", applicationsRouter);
app.use("/api/recruitment/screening", screeningRouter);
app.use("/api/recruitment/interviews", interviewsRouter);
app.use("/api/recruitment/emails", emailsRouter);
app.use("/api/recruitment/ai-interviews", aiInterviewRecruiterRouter);

app.get(["/ai-interview", "/ai-interview.html"], (_req, res) => {
  const targetOrigin = process.env.PUBLIC_APP_URL && !process.env.PUBLIC_APP_URL.includes(":3001")
    ? process.env.PUBLIC_APP_URL
    : "http://localhost:5173";
  const targetUrl = `${targetOrigin.replace(/\/$/, "")}/ai-interview`;
  res.format({
    html: () => {
      res.status(302).setHeader("Location", targetUrl).send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting to Interview...</title>
  <script>
    window.location.replace("${targetUrl}" + (window.location.hash || ""));
  </script>
</head>
<body>
  <p>Redirecting to your interview session... If you are not redirected, <a id="link" href="${targetUrl}">click here</a>.</p>
  <script>
    var l = document.getElementById("link");
    if (l) l.href = "${targetUrl}" + (window.location.hash || "");
  </script>
</body>
</html>`);
    },
    default: () => {
      res.redirect(302, targetUrl);
    }
  });
});

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
// Express serves the local HTML app from the repository root, which also
// contains the recruitment service. Never let static middleware expose the
// private resume directory; downloads go through the scoped API route only.
app.use("/recruitment-server/private-uploads", (_req, res) => res.sendStatus(404));
app.use(express.static(projectRoot));
app.use((error, _req, res, _next) => {
  const status = error.statusCode || (error.name === "MulterError" ? 400 : 500);
  if (status >= 500) console.error("Recruitment service error:", error.name);
  const expose = status < 500 || error.expose || process.env.NODE_ENV !== "production";
  res.status(status).json({ error: expose ? error.message : "The recruitment service could not complete this request." });
});

mongoose.connect(config.mongoUri).then(() => {
  app.listen(config.port, () => console.log(`HireMind recruitment service listening on http://127.0.0.1:${config.port}`));
}).catch((error) => { console.error("MongoDB connection failed:", error.message); process.exitCode = 1; });
