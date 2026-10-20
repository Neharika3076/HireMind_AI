# HireMind recruitment service

This is a separate Express service for recruitment data. It uses its own MongoDB collections (`recruitmentjobs`, `recruitmentcandidates`, `recruitmentcandidateaccounts`, `recruitmentapplications`, `recruitmentscreeningresults`, `recruitmentinterviews`, `recruitmentactivities`, and `recruitmentemaillogs`). Resume files are private and are served only by an organization-scoped application download endpoint.

Public candidates create an application-history password (8–128 characters) on their first application and reuse it with that email to view their applications across companies. Candidate profiles stay organization-scoped; only the candidate-facing history endpoint uses the account-to-application relationship. Recruiter application decisions and each submitted resume are stored on the application, not shared with other applications.

## Run locally

1. Start MongoDB locally, or set `MONGODB_URI` to a MongoDB instance you control.
2. Copy `.env.example` to `.env` and set any required values. Keep secrets only in `.env`.
3. In this folder, run `npm install` and then `npm run dev`.
4. Start the existing AI service separately from `Resume_HireMind/backend` (normally `uvicorn main:app --reload --port 8000`).
5. If you normally open HireMind as `file:///...`, keep doing that and open `recruitment.html` from the same folder after signing in. The dashboard will call the local service at port 3001. If you prefer the HTTP version, sign in through `http://127.0.0.1:3001/login.html` first, then open `http://127.0.0.1:3001/recruitment.html`; browser sessions are separated by origin.

The current HireMind EMS uses browser-local authentication only. Therefore local development still passes organization and role through request headers. Those values are forgeable: this is not production-grade tenant authorization. The recruiter API intentionally fails closed when `NODE_ENV=production` until server-verified recruiter sessions and organization membership checks are connected. Candidate accounts use server-side scrypt password hashes, but email ownership verification is not implemented; configure a verification flow before public deployment.

## Organization attendance

The organization workspace backend (`backend`, port 5000) stores attendance in MongoDB. `GET /api/attendance/today` returns only the signed-in user's record for employees, HR, and executives; administrators receive the active members and attendance for their own organization. `GET /api/attendance/history?page=1&limit=30` returns saved daily records newest first, scoped to the signed-in user for employees, HR, and executives or to the organization for administrators; use the returned `hasMore` value to load subsequent pages. `GET /api/attendance/calendar?year=2026&month=10` returns the signed-in user's month view and totals. A completed workday below five hours is a half day; at least five hours is present. `POST /api/attendance/check-in` creates one daily record per user, enforced by a unique organization/user/day index. `POST /api/attendance/check-out` records the checkout time and elapsed seconds once.

`POST /api/leaves` submits an inclusive date-range leave request. Approved leave is limited to three calendar days per user per month (weekends count); pending requests do not consume the balance. `GET /api/leaves` returns only the signed-in user's requests, employee requests awaiting HR review, or organization requests for admins. `POST /api/leaves/:id/decision` accepts `{ "decision": "approved" }` or `{ "decision": "rejected" }`; HR can review employee requests, while admins can review all requests. Admin leave is approved automatically at submission, and HR leave requires admin review. Approved leave cannot overlap a date with recorded attendance. The attendance day defaults to `Asia/Kolkata`; set `ATTENDANCE_TIME_ZONE` to an IANA timezone if the organization uses another timezone.

Newly registered organizations receive an `HR & Hiring` department. Admins can assign HR accounts to it from Add Member; HR accounts also have access to the recruitment workspace and job-management actions, but only admins can delete job openings.

Organization members report through `Admin → Executive → Manager → Employee`. Managers and employees report to a person in the same department; executives, HR, and managers are assigned the appropriate next-level approver when added.

## Existing data checks

- `npm run audit:data` reports archived jobs and legacy applications without changing data. Archived jobs are not automatically republished or converted because the correct previous state cannot be inferred reliably.
- `npm run migrate:resumes` performs a dry run to link an application to a resume only when a screening record matches the exact application, organization, job, and candidate. Review the counts first; pass `-- --apply` to write those unambiguous links. Ambiguous and missing-file records are left for manual review.
- The audit also counts legacy applications without a candidate account. They are not automatically attached to a new candidate login because legacy applications have no verified account relationship; verify the candidate identity before any manual account linkage.
- Permanent job deletion removes job-owned applications, screening results, interviews, email logs, and unreferenced per-application resume files while preserving candidate profiles and other applications. MongoDB replica sets use transactions; local standalone MongoDB uses ordered cleanup with job deletion last because it does not support multi-document transactions.

SMTP sending stays disabled until all SMTP values are provided in `.env`; the email endpoints then record delivery attempts and require an idempotency key to prevent accidental double sends. AI interview invitation links are sent only by email. If SMTP is missing or fails, the invitation is marked failed and can be retried; the raw interview link is not returned to the recruiter UI.

## AI interviews

The AI interview module is a separate submodule within this same Express/MongoDB process; no second server or database is needed. It adds isolated AI-interview collections and a React candidate interview page, while preserving the existing human-interview scheduler and resume/ATS service. For setup, API contracts, security limits, and data flow, see [AI_INTERVIEW_ARCHITECTURE.md](AI_INTERVIEW_ARCHITECTURE.md). Set `GROQ_INTERVIEW_API_KEY`, `GROQ_INTERVIEW_MODEL`, `PUBLIC_APP_URL`, and SMTP values in this folder's `.env`, then restart `npm run dev`. Interview links are sent only to the candidate's email; configure SMTP before inviting candidates.
