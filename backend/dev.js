const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const windows = process.platform === "win32";
const npmCommand = windows ? "npm.cmd" : "npm";
const mode = process.argv[2] || "all";

function readLocalSetting(name, fallback) {
  if (process.env[name]) return process.env[name];
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return fallback;
  const line = fs.readFileSync(envPath, "utf8").split(/\r?\n/)
    .find((entry) => entry.trimStart().startsWith(`${name}=`));
  if (!line) return fallback;
  return line.slice(line.indexOf("=") + 1).trim().replace(/^(["'])(.*)\1$/, "$2") || fallback;
}

const pythonEnv = path.join(projectRoot, "backend", "resume-ai", windows
  ? path.join("venv", "Scripts", "python.exe")
  : path.join("venv", "bin", "python"));
const pythonCommand = process.env.HIREMIND_PYTHON || (fs.existsSync(pythonEnv)
  ? pythonEnv
  : windows ? "py" : "python3");
const pythonPrefix = pythonCommand === "py" ? ["-3"] : [];
const services = {
  organization: {
    command: process.execPath,
    args: ["--watch", "server.js"],
    cwd: path.join(projectRoot, "backend", "organization-api"),
    env: { ORGANIZATION_PORT: readLocalSetting("ORGANIZATION_PORT", "5000") }
  },
  recruitment: {
    command: process.execPath,
    args: ["--watch", "src/server.js"],
    cwd: path.join(projectRoot, "backend", "recruitment-api"),
    env: { RECRUITMENT_PORT: readLocalSetting("RECRUITMENT_PORT", "3001") }
  },
  resumeAi: {
    command: pythonCommand,
    args: [...pythonPrefix, "-m", "uvicorn", "main:app", "--port", readLocalSetting("RESUME_AI_PORT", "8000")],
    cwd: path.join(projectRoot, "backend", "resume-ai")
  },
  frontend: {
    command: npmCommand,
    args: ["run", "dev", "--", "--host", "0.0.0.0"],
    cwd: path.join(projectRoot, "frontend", "portal"),
    shell: windows
  }
};

const selections = {
  all: ["organization", "recruitment", "resumeAi", "frontend"],
  backend: ["organization", "recruitment", "resumeAi"],
  frontend: ["frontend"],
  organization: ["organization"],
  recruitment: ["recruitment"],
  "resume-ai": ["resumeAi"]
};

if (!selections[mode]) {
  console.error(`Unknown mode "${mode}". Choose all, backend, frontend, organization, recruitment, or resume-ai.`);
  process.exit(2);
}

const children = [];
let stopping = false;

function stopChildren(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill(signal);
  }
}

process.on("SIGINT", () => {
  stopChildren("SIGINT");
  process.exitCode = 130;
});
process.on("SIGTERM", () => stopChildren("SIGTERM"));

for (const name of selections[mode]) {
  const service = services[name];
  console.log(`[${name}] starting`);
  const child = spawn(service.command, service.args, {
    cwd: service.cwd,
    env: { ...process.env, ...(service.env || {}) },
    shell: Boolean(service.shell),
    stdio: "inherit",
    windowsHide: true
  });
  children.push(child);
  child.on("error", (error) => {
    console.error(`[${name}] failed to start: ${error.message}`);
    process.exitCode = 1;
    stopChildren();
  });
  child.on("exit", (code) => {
    if (stopping) return;
    if (code !== 0) {
      console.error(`[${name}] exited with code ${code}; stopping the other services.`);
      process.exitCode = code || 1;
      stopChildren();
    }
  });
}
