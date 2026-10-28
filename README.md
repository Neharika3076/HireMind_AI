# HireMind AI

HireMind is a multi-organization people and recruitment platform. It combines an employee-management system (organization registration, members, departments, attendance, leave, projects, tasks, and payroll) with a recruitment workflow (job openings, applications, private resume uploads, screening, interviews, and AI-assisted assessment).

This repository is a monorepo, but the services are deliberately separate: one React/Vite frontend, two Node/Express APIs, and one Python/FastAPI AI service. FastAPI is not embedded in either Express server.

> **Important security status:** this is a demo project, not production-ready authentication. The repository's recruitment middleware fails closed in production until server-verified recruiter authentication is implemented. A live check on 2026-10-27 also observed the deployed recruitment dashboard accepting fabricated identity headers, which means the deployed service/configuration did not match that safeguard. Do not put real organization or candidate data on the public deployment until this discrepancy and the authentication design are fixed.

## Contents

- [Capabilities](#capabilities)
- [Architecture and request flow](#architecture-and-request-flow)
- [Repository structure](#repository-structure)
- [Technology stack](#technology-stack)
- [Run locally](#run-locally)
- [Environment variables](#environment-variables)
- [API overview](#api-overview)
- [Authentication and security](#authentication-and-security)
- [Testing and build](#testing-and-build)
- [Render deployment](#render-deployment)
- [Troubleshooting](#troubleshooting)

## Capabilities

### Organization / employee management

- Register an organization and create its first administrator.
- Manage users, roles, departments, managers, and reporting relationships.
- Record attendance and review attendance history/calendar data.
- Submit leave requests and route decisions according to the employee hierarchy.
- Create projects and tasks, assign work, and update task status.
- Maintain payroll structures, employee assignments, payroll records, and adjustments.
- Apply role and organization scoping in authenticated Organization API routes.

### Recruitment

- Create, analyze, publish, close, archive, and delete job openings.
- Show published openings on the public careers experience.
- Accept candidate applications and resume uploads; avoid duplicate applications to the same job.
- Extract resume profiles and match them against job requirements through the AI service.
- Review candidates, applications, screening results, interviews, email delivery, and activity.
- Send AI interview invitations by email, receive candidate responses, and produce recruiter-facing reports.
- Treat AI scores as decision support only; human review remains necessary.

### AI interview privacy summary

The AI interview is text-based. The application does not use camera, microphone, face/emotion analysis, or screen recording. Optional technical monitoring can report tab-focus and connection events; these signals are imperfect and do not change the interview score. Candidates may request an alternative assessment.

## Architecture and request flow

```text
Candidate / employee / recruiter browser
                 |
                 v
       React + Vite portal (static)
          |                 |
          |                 +--> Organization API (Express) --> Organization MongoDB
          |
          +--> Recruitment API (Express) --> Recruitment MongoDB
                         |
                         +--> FastAPI AI service --> Groq / configured model provider
                         |
                         +--> Resend email service
                         +--> private resume storage
```

### Example: employee login

1. The React login page sends the identifier and password to `POST /api/auth/login` on the Organization API.
2. The Organization API checks the user in MongoDB and signs a JWT on the server.
3. It returns the JWT as the `terrahire_token` HTTP-only cookie. The frontend does not put this token in `sessionStorage`; the browser sends the cookie on later authenticated Organization API requests.
4. The API verifies the cookie, reloads the current user/role, and scopes database work to that organization.

### Example: job posting and candidate application

1. A recruiter creates a job through the Recruitment API.
2. Before publication, the Recruitment API can send the description to FastAPI at `POST /api/job/analyze`; the job/profile result is saved by Recruitment.
3. The public careers page fetches published jobs from `GET /api/recruitment/public/jobs`.
4. A candidate submits an application and resume to the Recruitment API. The resume is stored privately, not served as a static file.
5. Recruitment calls FastAPI for resume extraction and ATS matching, then stores the candidate/application/screening result in its MongoDB database.

### Example: AI interview invitation

1. A recruiter sends an invitation from the Recruitment interface after the application has completed screening.
2. The Recruitment server generates a random invitation secret, stores only its hash, and emails the link through Resend.
3. The candidate opens the link and consents before starting. The server validates expiry, application status, and the token hash.
4. The server creates a separate interview session token; answers/evaluations are stored in the interview session and the recruiter sees the report in Recruitment.

### Responsibilities and data stores

- **Organization API:** organization/user/department/attendance/leave/project/task/payroll records; configured by `MONGO_URI`.
- **Recruitment API:** jobs/candidates/applications/screenings/interviews/email logs/interview sessions; configured by `MONGODB_URI`. Resume files are kept in private upload storage, and production storage should be the Recruitment service's mounted persistent disk.
- **FastAPI:** stateless request/response AI processing for job analysis, resume extraction, and ATS matching. Extracted results are returned to Recruitment; FastAPI does not own the application's MongoDB records.
- The two MongoDB URI variables are intentionally separate. They may point to the same Atlas cluster if desired, but configure the databases/permissions deliberately; do not assume that the names are interchangeable.

## Repository structure

```text
HireMind_AI/
├── frontend/
│   ├── portal/                 # Main React + Vite application
│   │   └── src/
│   │       ├── components/     # Shared UI
│   │       ├── pages/          # Dashboard, directory, attendance, recruitment, etc.
│   │       ├── config/api.js   # Frontend API base URLs
│   │       └── utils/          # Shared frontend helpers
│   ├── legacy/                 # Older HTML/CSS/JS pages served for compatibility
│   └── resume-analyzer/        # Standalone browser-based resume analyzer
├── backend/
│   ├── dev.js                  # Local process runner for separate services
│   ├── organization-api/       # CommonJS Express API (models/routes/controllers)
│   ├── recruitment-api/        # ES module Express API (src/models/routes/controllers/services)
│   │   ├── src/ai-interviews/  # Interview models, routes, and services
│   │   └── private-uploads/    # Local-only private upload location
│   └── resume-ai/              # FastAPI app and Python AI services
│       └── hiremind_ai/
│           ├── api/            # FastAPI route declarations
│           ├── controllers/    # Request orchestration and validation
│           ├── models/         # Pydantic request/response profiles
│           └── services/       # Parsing, LLM calls, scoring/matching
├── recruitment-server/         # Legacy local folder; not the active Express entrypoint
├── .env                        # Local secrets/configuration; never commit
├── .gitignore
├── package.json                # Root convenience scripts
├── render.yaml                 # Four-service Render Blueprint
├── AI_INTERVIEW_ARCHITECTURE.md
└── README.md
```

The `backend/organization-api` and `backend/recruitment-api` directories are independent Express applications. The React portal is built and deployed separately. The Recruitment server serves the legacy UI and standalone analyzer from `frontend/`; it does not make private candidate uploads public.

## Technology stack

| Layer | Main technologies |
|---|---|
| Main UI | React 18, React Router, Vite, CSS |
| Organization backend | Node.js, Express, Mongoose, JWT, bcrypt |
| Recruitment backend | Node.js, Express, Mongoose, Multer, Axios, Resend |
| AI backend | Python, FastAPI, Uvicorn, Pydantic, PyMuPDF, python-docx, Groq/OpenAI-compatible client |
| Persistence | MongoDB (separately configured for organization and recruitment data) |
| Hosting | Render static site + independent web services |

## Run locally

### Prerequisites

- Node.js 20 or newer and npm.
- Python 3.10 or newer and `pip`.
- MongoDB connection strings for the Organization and Recruitment services.
- AI provider key(s) for AI-powered analysis/matching features.
- Resend API key if email delivery is to be tested.

### Install dependencies

Run these commands from the repository root in PowerShell:

```powershell
npm ci --prefix backend/organization-api
npm ci --prefix backend/recruitment-api
npm ci --prefix frontend/portal
py -3 -m venv backend/resume-ai/venv
backend/resume-ai/venv/Scripts/python.exe -m pip install -r backend/resume-ai/requirements.txt
```

If `backend/resume-ai/venv` already exists, skip the virtual-environment creation and install step unless dependencies need updating.

### Configure local environment

Create or update the single root `.env` file. The [environment variables](#environment-variables) section lists names and their owning service. Never paste `.env` contents into chats, screenshots, tickets, or source control.

For a typical local run, the frontend is at `http://localhost:5173`, Organization API at port `5000`, Recruitment API at port `3001`, and FastAPI at port `8000`. Configure both MongoDB URIs before starting the Node backends.

### Start everything

From the project root:

```powershell
npm run dev
```

This starts four processes without merging them: Organization Express, Recruitment Express, FastAPI/Uvicorn, and Vite. Press `Ctrl+C` in that terminal to stop the runner and its child processes.

To run frontend and backends in separate terminals:

```powershell
# Terminal 1: all three backends
npm run dev:backend

# Terminal 2: React/Vite
npm run dev:frontend
```

The runner also supports one service at a time:

```powershell
node backend/dev.js organization
node backend/dev.js recruitment
node backend/dev.js resume-ai
```

### Local URLs

| Service | URL |
|---|---|
| React/Vite portal | `http://localhost:5173/` |
| Organization health | `http://localhost:5000/api/health` |
| Recruitment health | `http://localhost:3001/api/recruitment/health` |
| FastAPI health | `http://localhost:8000/health` |
| FastAPI Swagger UI | `http://localhost:8000/docs` |
| FastAPI ReDoc | `http://localhost:8000/redoc` |
| FastAPI OpenAPI JSON | `http://localhost:8000/openapi.json` |
| Legacy frontend served by Recruitment | `http://localhost:3001/` |
| Standalone resume analyzer | `http://localhost:3001/resume-analyzer/` |

In local development, Vite proxies `/api/recruitment/*` to port `3001` and other `/api/*` paths to port `5000`. This proxy is a development convenience; the production build uses the Render API base URLs.

## Environment variables

Use one root `.env` for local development and configure each Render service separately in its Environment tab. The root `.env` is ignored by Git. Names below are documented; **do not commit or share their secret values**.

| Variable(s) | Service | Purpose |
|---|---|---|
| `MONGO_URI` | Organization API | Organization database connection. Required by the server. |
| `JWT_SECRET` | Organization API | Signs and verifies organization login JWTs. Use a strong, private value. |
| `CLIENT_URL` | Organization API | Frontend origin allowed by Organization API CORS. |
| `ORGANIZATION_PORT` | Organization API, local | Local port; Render supplies `PORT` in deployment. Default local port is `5000`. |
| `ATTENDANCE_TIME_ZONE` | Organization API | Time zone used for attendance dates; defaults to `Asia/Kolkata`. |
| `MONGODB_URI` | Recruitment API | Recruitment database connection. |
| `RECRUITMENT_PORT` | Recruitment API, local | Local port; Render supplies `PORT`. Default local port is `3001`. |
| `HIREMIND_AI_BASE_URL` | Recruitment API | FastAPI origin, e.g. local `http://127.0.0.1:8000`; in Render, the FastAPI service origin. Do not append `/api` here. |
| `ALLOWED_ORIGIN` | Recruitment API | Exact portal origin allowed by Recruitment CORS, without a trailing slash. |
| `PUBLIC_APP_URL` | Recruitment API | Candidate-facing portal origin used to construct interview links. |
| `UPLOAD_DIRECTORY` | Recruitment API | Private resume directory. In Render, point it at the mounted persistent disk path. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Recruitment API | Email delivery. Current `services/email.js` sends through Resend; `EMAIL_FROM` controls the sender. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Legacy/unused by active sender | The current active email service uses Resend, not SMTP. Do not assume configuring these enables email. |
| `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_BASE_URL` | FastAPI | Job-description analysis and resume extraction/model endpoint configuration. |
| `GROQ_MATCHER_API_KEY` or `GROQ_API_KEY_2` | FastAPI | Optional separate key for semantic resume/job matching; falls back to the primary key if absent. |
| `GROQ_INTERVIEW_API_KEY`, `GROQ_INTERVIEW_MODEL` | Recruitment API / FastAPI fallback | AI-interview model configuration. The Recruitment interview service reads its interview key directly; AI service code may use it as a fallback. |
| `AI_INTERVIEW_RETENTION_DAYS` | Recruitment API | Minimum retention window configuration for interview records; defaults to 90 days (at least 30). |
| `CORS_ORIGINS` | FastAPI | Comma-separated browser origins allowed to call FastAPI directly. Include local origins for development and deployed origins if using the standalone browser analyzer. |
| `VITE_ORGANIZATION_API_BASE` | Portal build | Organization API base, including `/api`. Example: `https://<organization-host>/api`. |
| `VITE_RECRUITMENT_API_BASE` | Portal build | Recruitment API base, including `/api/recruitment`. Example: `https://<recruitment-host>/api/recruitment`. |
| `VITE_RESUME_API_BASE` | Portal build (reserved) | Exported by frontend config, but the main React portal currently routes its AI tasks through Recruitment rather than calling FastAPI directly. |
| `NODE_ENV`, `PORT` | Render/runtime | Render sets `NODE_ENV=production` in the Blueprint and injects `PORT`; do not change production mode to bypass auth checks. |

### Current Render service URLs

These are the URLs used during the latest project check; verify them in Render if a service is renamed:

| Service | Current URL |
|---|---|
| Portal | `https://hiremind-coir.onrender.com` |
| Organization API | `https://hiremind-organization.onrender.com` |
| Recruitment API | `https://hiremind-ai-2-ymtr.onrender.com` |
| FastAPI | `https://hiremind-resume-ai.onrender.com` |

For the Portal Render service, set:

```text
VITE_ORGANIZATION_API_BASE=https://hiremind-organization.onrender.com/api
VITE_RECRUITMENT_API_BASE=https://hiremind-ai-2-ymtr.onrender.com/api/recruitment
```

`VITE_*` values are compiled into the static JavaScript at build time. After changing them in Render, trigger a new portal build/deploy. The frontend does not discover API hosts dynamically.

For Recruitment, set `HIREMIND_AI_BASE_URL` to `https://hiremind-resume-ai.onrender.com`. Set `CLIENT_URL`, `ALLOWED_ORIGIN`, and `PUBLIC_APP_URL` to the portal origin (no trailing slash). FastAPI's `CORS_ORIGINS` should include the portal and Recruitment origins when browser pages call FastAPI directly, for example:

```text
https://hiremind-coir.onrender.com,https://hiremind-ai-2-ymtr.onrender.com
```

The normal React Recruitment flow makes AI calls from the Recruitment server to FastAPI server-to-server, so browser CORS does not apply to that internal hop. The standalone analyzer page calls FastAPI from the browser, so its page origin must be allowed by FastAPI CORS.

## API overview

The Express APIs do not currently publish a generated OpenAPI document. For complete request/response details, inspect the route/controller source files listed below. FastAPI publishes interactive docs at `/docs` and `/redoc`.

### Organization API

Base URL locally: `http://localhost:5000`. Production base URL: Organization service origin. Route mount points are defined in `backend/organization-api/server.js`.

| Route group | Main functionality |
|---|---|
| `GET /api/health` | Service liveness check. |
| `POST /api/organizations/register` | Register an organization and its administrator. |
| `/api/auth/*` | Login, current-user lookup, logout, and admin-only example. Login body uses `identifier` and `password`; it sets an HTTP-only cookie. |
| `/api/users/*` | List/create members (admin), current user, manager team, and assignment options. |
| `/api/departments/*` | List departments and create departments (admin). |
| `/api/attendance/*` | Today, history, calendar, check-in, and check-out. |
| `/api/leaves/*` | List/request leave and record an approval/rejection decision. |
| `/api/projects/*` | List and create organization-scoped projects. |
| `/api/tasks/*` | List tasks, list current user's tasks, create tasks, and update task status. |
| `/api/payroll/*` | Salary structures, employee assignment, payroll processing, records, adjustments, and status. |

Example health request:

```text
GET http://localhost:5000/api/health
```

### Recruitment API

Base URL locally: `http://localhost:3001/api/recruitment`. Production base URL: Recruitment service origin plus `/api/recruitment`. Route mount points are defined in `backend/recruitment-api/src/server.js`.

| Route group | Main functionality |
|---|---|
| `GET /api/recruitment/health` | Recruitment database and FastAPI dependency health summary. |
| `/api/recruitment/public/jobs*` | Public openings, job details, candidate account/history, and job applications with resume upload. |
| `/api/recruitment/dashboard` | Recruitment dashboard metrics/activity. |
| `/api/recruitment/jobs*` | Recruiter job CRUD/workflow, publish/close/archive/delete, AI job analysis. |
| `/api/recruitment/candidates*` | Candidate list/detail/update. |
| `/api/recruitment/applications*` | Application list/detail/status and scoped resume download. |
| `/api/recruitment/screening*` | Job screening results and screening retry. |
| `/api/recruitment/interviews*` | Scheduled interview list/create/update/cancel/feedback. |
| `/api/recruitment/emails*` | Email templates/logs, preview, and send. Delivery currently uses Resend. |
| `/api/recruitment/ai-interviews*` | Recruiter templates/invitations, resend/revoke, report, human review, and integrity-event review. |
| `/api/recruitment/public/ai-interviews*` | Candidate invite validation, start/resume, answer submission, alternative request, and limited status endpoints. |

Public jobs example:

```text
GET http://localhost:3001/api/recruitment/public/jobs
```

Most recruiter routes are intended to require an authenticated recruiter context. See [Authentication and security](#authentication-and-security) before using protected routes in a deployed environment.

### FastAPI AI service

Base URL locally: `http://localhost:8000`. The root FastAPI paths are mounted in `backend/resume-ai/main.py`:

| Method and route | Input/purpose |
|---|---|
| `GET /health` | Health check. |
| `POST /api/job/analyze` | JSON job description; returns AI-extracted job requirements/profile. |
| `POST /api/resume/extract` | Multipart upload with a `file` field; accepts supported resume documents and returns extracted text/profile. |
| `POST /api/ats/match` | JSON resume and job profiles; returns matching evidence/results. |
| `GET /docs` | Swagger UI. |
| `GET /redoc` | ReDoc. |
| `GET /openapi.json` | OpenAPI schema. |

Example health check:

```text
GET http://localhost:8000/health
```

## Authentication and security

- Organization login JWTs are generated and signed by the Organization API. The browser receives the token in the `terrahire_token` HTTP-only cookie; it is not expected in Session Storage. The cookie is sent on cross-origin requests with `credentials: "include"`.
- AI interview invitation and interview-session secrets are generated by the Recruitment server. Only token hashes are persisted; raw invitation secrets are delivered in email and raw session secrets are returned to the candidate browser for the session.
- The Recruitment frontend currently constructs `x-ems-*` headers from the browser's EMS user state. Client-supplied role/user/organization headers are forgeable and must not serve as production authentication.
- `backend/recruitment-api/src/middleware/auth.js` currently returns `503` in `NODE_ENV=production` until server-verified recruiter authentication is connected. Keep this safeguard enabled; implement a verified shared JWT/session or equivalent server-to-server identity validation instead of disabling production mode.
- **Last deployment check (2026-10-27):** the public Recruitment dashboard returned `200` to a request carrying fabricated identity headers for a synthetic organization and returned empty metrics. No real tenant data was queried. This indicates the live deployment may be using a different commit or environment from this repository. Verify the deployed commit and `NODE_ENV` in Render before using protected Recruitment data.
- FastAPI's health endpoint can be healthy while an AI provider key/model is invalid. Health checks connectivity, not successful completion of every LLM operation.
- Resume uploads and candidate information are sensitive. Keep uploaded files outside static roots, restrict downloads to authorized organization-scoped endpoints, and never place secrets or resume text in public logs.
- AI/ATS/interview results are decision-support signals, not automatic hiring decisions. Recruiter review is required.

## Testing and build

From the repository root:

```powershell
# Node API test suites
npm test

# Production React build
npm run build

# Python/FastAPI tests
backend/resume-ai/venv/Scripts/python.exe -m pip install pytest
Push-Location backend/resume-ai
.\venv\Scripts\python.exe -m pytest tests
Pop-Location
```

The root `npm test` runs tests for the Recruitment and Organization APIs. Python tests are run separately. The FastAPI interactive docs are useful for validating request schemas without going through the frontend; actual AI calls require valid provider configuration and may consume provider quota.

## Render deployment

The root `render.yaml` defines four independent services:

1. **Organization API** — Node/Express, health check `/api/health`.
2. **Recruitment API** — Node/Express, health check `/api/recruitment/health`, private upload directory on a mounted disk.
3. **Resume AI** — Python/Uvicorn, health check `/health`.
4. **Portal** — static Vite build with a rewrite to `index.html` for client-side routes.

The repository root is used as the Render service root so the Recruitment service can read frontend assets outside its own folder. Render commands and environment-variable names are maintained in `render.yaml`; secret values are configured in each service's Render Environment settings, not in Git.

Deployment checklist:

1. Deploy each backend service and confirm its health endpoint.
2. Configure `MONGO_URI` for Organization and `MONGODB_URI` for Recruitment, plus the relevant provider/email settings.
3. Set Recruitment's `HIREMIND_AI_BASE_URL` to the FastAPI service origin. Check Recruitment health reports the database connected and AI dependency healthy.
4. Set Organization `CLIENT_URL`, Recruitment `ALLOWED_ORIGIN` and `PUBLIC_APP_URL`, and FastAPI `CORS_ORIGINS` to the exact deployed origins required by browser calls.
5. Set the Portal's `VITE_ORGANIZATION_API_BASE` and `VITE_RECRUITMENT_API_BASE`; redeploy the Portal so Vite bakes these values into its static bundle.
6. Test public job listing/application, organization login and cookie behavior, AI extraction/matching, email delivery, and protected recruiter routes separately.
7. Confirm server-verified recruiter authentication and tenant scoping before exposing protected recruitment data to real users.

Free-tier services may sleep or cold-start. A health response confirms a service is running; it does not prove that every route, credentials, CORS path, email, or LLM model is working.

## Troubleshooting

| Symptom | What to check |
|---|---|
| `EADDRINUSE` | Another process already owns the local port. Stop the duplicate service or change its local port in `.env`. |
| Organization API fails to start | Confirm `MONGO_URI` and `JWT_SECRET` are set in the local root `.env` or Render environment. |
| Recruitment API reports Mongo connection failure | Confirm `MONGODB_URI`, Atlas network access, and database user permissions. |
| Recruitment health says AI unavailable | Confirm `HIREMIND_AI_BASE_URL` points to the FastAPI service origin and `/health` responds. |
| Browser reports CORS | Check the exact origin (scheme + host, no trailing slash), the owning service's CORS setting, and whether the call is browser-to-server or server-to-server. |
| Portal calls `localhost` after deployment | Check the live built JS and Render `VITE_*` values, then rebuild/redeploy the static site. Vite env values are compile-time. |
| FastAPI returns 422 | The request reached FastAPI, but its body/file does not match the endpoint schema. See `/docs` for required shapes. |
| FastAPI or Groq returns 5xx | Check FastAPI logs, active API key/model configuration, quota, and upstream provider availability. |
| Login succeeds but `/api/auth/me` returns 401 | Inspect the login response cookie in browser DevTools; verify `credentials: "include"`, secure cookie flags, CORS credentials, and browser cookie blocking. Never share the cookie value. |
| Protected Recruitment route returns 401/503 | 401 means no recognized recruiter context; 503 is the production fail-closed safeguard. Do not bypass it with client-generated identity headers. |
| Interview email is not sent | The active email implementation uses Resend; check `RESEND_API_KEY`, `EMAIL_FROM`, recipient status, and Recruitment logs. SMTP variables alone do not configure the current sender. |
| Standalone resume analyzer is blocked calling FastAPI | Add the analyzer page's origin to FastAPI `CORS_ORIGINS`; the main React recruitment flow normally calls FastAPI from the Recruitment server instead. |

## Contributing and secret handling

- Keep Organization, Recruitment, and FastAPI responsibilities separate.
- Keep UI code under `frontend/` and backend logic under `backend/`.
- Update this README and the relevant route/controller tests when changing API behavior.
- Never commit `.env`, provider keys, JWT secrets, candidate resumes, private upload folders, `node_modules`, or Python virtual environments.
- If a credential was ever exposed in a terminal, screenshot, chat, or repository, rotate it in its provider and update the corresponding Render/local environment value.