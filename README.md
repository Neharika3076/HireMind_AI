# HireMind AI

HireMind is organized as one repository with separate frontend and backend areas. The organization API, recruitment API, and resume-analysis API stay as independent services; FastAPI is not merged into either Express application.

## Project layout

```text
HireMind_AI/
├── frontend/
│   ├── portal/             # React + Vite application
│   ├── legacy/             # Existing HTML/CSS/JS dashboard and careers pages
│   └── resume-analyzer/    # Standalone resume-analysis page
├── backend/
│   ├── organization-api/   # Express + MongoDB: auth, org, attendance, tasks, payroll
│   ├── recruitment-api/    # Express + MongoDB: jobs, candidates, applications, interviews
│   ├── resume-ai/          # FastAPI: resume extraction, job analysis, ATS matching
│   └── dev.js              # Local process runner; starts services without merging them
├── .env                    # One local environment file; never commit it
├── .gitignore              # Shared ignore rules
├── render.yaml             # Render Blueprint for the separately deployed services
└── AI_INTERVIEW_ARCHITECTURE.md
```

The legacy HTML app, React portal, and standalone analyzer UI are all under `frontend/`. No frontend source or build output is kept inside a backend service. `backend/recruitment-api` serves the legacy pages from `frontend/legacy` for local compatibility; uploaded candidate documents remain outside the static directory and are only returned by organization-scoped API routes.

## Local setup

Prerequisites: Node.js 20+, Python 3.10+, MongoDB connection strings, and the credentials needed for any AI/email features you use. The existing Python environment is in `backend/resume-ai/venv`.

If dependencies are not installed yet, from PowerShell at the project root:

```powershell
npm install --prefix backend/organization-api
npm install --prefix backend/recruitment-api
npm install --prefix frontend/portal
py -3 -m venv backend/resume-ai/venv
backend/resume-ai/venv/Scripts/python.exe -m pip install -r backend/resume-ai/requirements.txt
```

Copy the required settings into the single root `.env` (the current local file has been consolidated). Keep its secret values private. Important settings include:

- `MONGO_URI`, `JWT_SECRET`, `ORGANIZATION_PORT` for the organization API.
- `MONGODB_URI`, `RECRUITMENT_PORT`, `ALLOWED_ORIGIN`, `PUBLIC_APP_URL` for recruitment.
- `HIREMIND_AI_BASE_URL`, `RESUME_AI_PORT`, `GROQ_API_KEY`, and optional matcher/interview keys for FastAPI and AI features.
- `CLIENT_URL` for the React portal, plus `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` for email.

Start everything together:

```powershell
npm run dev
```

That starts the three separate backend processes and the React/Vite frontend. Use `Ctrl+C` once to stop them. If you prefer separate groups, run `npm run dev:backend` and `npm run dev:frontend` in two terminals. The old HTML dashboard is served at `http://localhost:3001/`; the React portal is at `http://localhost:5173/`.

Local service routes:

- Organization Express API: `http://localhost:5000/api/health` and `/api/auth`, `/api/organizations`, `/api/users`, `/api/departments`, `/api/attendance`, `/api/leaves`, `/api/tasks`, `/api/projects`, `/api/payroll`.
- Recruitment Express API: `http://localhost:3001/api/recruitment/health` and `/api/recruitment/jobs`, `/candidates`, `/applications`, `/screening`, `/interviews`, `/dashboard`, `/emails`.
- Resume FastAPI: `http://localhost:8000/health`; resume and job-analysis routes are under `/api/resume`, `/api/job`, and `/api/ats`.

The Vite proxy routes `/api/recruitment/*` to the recruitment Express service and the other `/api/*` requests to the organization Express service. In production, the React build uses `VITE_ORGANIZATION_API_BASE` and `VITE_RECRUITMENT_API_BASE` instead of local ports.

## Checks

```powershell
npm test
npm run build
Push-Location backend/resume-ai
.\venv\Scripts\python.exe -m pytest tests
Pop-Location
```

## Deploying to Render

`render.yaml` defines four independent Render services: the organization Express API, recruitment Express API, FastAPI resume analyzer, and React static site. It deliberately leaves each service rooted at the repository root because the recruitment process serves frontend files from `frontend/`; Render makes files outside a configured service root unavailable. The blueprint provides its commands and health checks, but you must enter your MongoDB URLs, Groq/SMTP credentials, frontend origin, and API base URLs in Render's environment settings. For the Vite static site, set:

- `VITE_ORGANIZATION_API_BASE` to the organization service URL followed by `/api`.
- `VITE_RECRUITMENT_API_BASE` to the recruitment service URL followed by `/api/recruitment`.

Set `CLIENT_URL`, `ALLOWED_ORIGIN`, and `PUBLIC_APP_URL` to your deployed React site origin. Set `HIREMIND_AI_BASE_URL` to the deployed FastAPI service URL; the standalone analyzer page reads that URL from a small runtime configuration response. The recruitment service's Render persistent disk keeps private resume uploads between deploys.

Before exposing the recruitment dashboard publicly, note its existing production safeguard: the recruiter API intentionally rejects privileged requests in `NODE_ENV=production` until server-verified recruiter authentication is connected. Do not disable that safeguard to make the UI appear to work; finish the authentication integration first. Add the deployed portal and recruitment origins to FastAPI's comma-separated `CORS_ORIGINS` setting.

Do not combine the FastAPI code with the Express services or commit `.env`, private uploads, `node_modules`, or the Python virtual environment.
