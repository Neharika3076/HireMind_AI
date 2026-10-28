# HireMind recruitment service

This is a separate Express service for recruitment data. It uses its own MongoDB collections (`recruitmentjobs`, `recruitmentcandidates`, `recruitmentcandidateaccounts`, `recruitmentapplications`, `recruitmentscreeningresults`, `recruitmentinterviews`, `recruitmentactivities`, and `recruitmentemaillogs`). Resume files are private and are served only by an organization-scoped application download endpoint.

Public candidates create an application-history password (8–128 characters) on their first application and reuse it with that email to view their applications across companies. Candidate profiles stay organization-scoped; only the candidate-facing history endpoint uses the account-to-application relationship. Recruiter application decisions and each submitted resume are stored on the application, not shared with other applications.

## Run locally

1. Start MongoDB locally, or configure `MONGODB_URI` in the single project-root `.env`.
2. Install dependencies from the repository root if needed: `npm install --prefix backend/recruitment-api`.
3. Run all backend processes with `npm run dev:backend`, or run the whole local app with `npm run dev`.
4. Run the React portal alone with `npm run dev:frontend`. The original HTML dashboard remains under `frontend/legacy` and is served by the recruitment API at `http://localhost:3001/`.

The current HireMind EMS uses browser-local authentication only. Therefore local development still passes organization and role through request headers. Those values are forgeable: this is not production-grade tenant authorization. The recruiter API intentionally fails closed when `NODE_ENV=production` until server-verified recruiter sessions and organization membership checks are connected. Candidate accounts use server-side scrypt password hashes, but email ownership verification is not implemented; configure a verification flow before public deployment.

## Organization attendance

The organization workspace backend (`backend`, port 5000) stores attendance in MongoDB. `GET /api/attendance/today` returns only the signed-in user's record for non-admin accounts; administrators receive active members and attendance for their organization. `GET /api/attendance/history?page=1&limit=30` returns saved daily records newest first, scoped to the signed-in user for non-admin accounts or to the organization for administrators; use the returned `hasMore` value to load subsequent pages. `GET /api/attendance/calendar?year=2026&month=10` returns the signed-in user's month view and totals. A completed workday below five hours is a half day; at least five hours is present. `POST /api/attendance/check-in` creates one daily record per user, enforced by a unique organization/user/day index. `POST /api/attendance/check-out` records the checkout time and elapsed seconds once.

`POST /api/leaves` submits an inclusive date-range leave request. Approved leave is limited to three calendar days per user per month (weekends count); pending requests do not consume the balance. `GET /api/leaves?view=approvals` returns pending requests the caller can review; `GET /api/leaves?view=mine` returns the caller's own request history. `POST /api/leaves/:id/decision` accepts `{ "decision": "approved" }` or `{ "decision": "rejected" }`; a completed decision is removed from the pending approvals queue. Admin leave is approved automatically at submission, and HR & Hiring department members' leave requires admin review. Approved leave cannot overlap a date with recorded attendance. The attendance day defaults to `Asia/Kolkata`; set `ATTENDANCE_TIME_ZONE` to an IANA timezone if the organization uses another timezone.

Newly registered organizations receive an `HR & Hiring` department. HR is a department, not an account role: assign members to this department from Add Member to grant department-based access to recruitment and HR operations. Only admins can delete job openings.

Organization members have Admin, Executive, Manager, or Employee account roles. HR & Hiring department membership grants department-based HR access, and members of that department report to an admin. In other departments, executives report to an admin, managers can report to an admin or executive, and employees can report to an admin, executive, or manager.

## Organization payroll

The organization backend (`backend`, port 5000) exposes payroll routes under `/api/payroll`. Every route requires the signed-in HTTP-only session and an organization membership. Admins and members of the HR & Hiring department can configure salary structures, assign them to active executive/manager/employee accounts, list organization payroll, process a payroll period, or update payment status. Other payroll employees can read only their own payroll records and individual payslips.

- `GET/POST /api/payroll/structures` lists or creates organization salary structures. A structure includes `name`, `baseSalary`, `allowances` and `deductions` (named `{ "name", "amount" }` lists), and optional three-letter uppercase `currency`.
- `PATCH /api/payroll/structures/:id` updates a structure; set `active` to `false` to prevent future assignments and processing.
- `GET /api/payroll/employees` lists active payroll-eligible employees and their assigned structure. `PUT /api/payroll/employees/:employeeId/structure` accepts `{ "salaryStructureId": "<id>" }`; use `null` to unassign.
- `POST /api/payroll/process` accepts `{ "month": 1, "year": 2026 }` (month names are also accepted). It snapshots the assigned structure and breakdown to one payroll record per active eligible employee. Repeating a period is idempotent; employees without an active structure are returned in `skippedEmployees`.
- `GET /api/payroll` lists all organization payroll for admins and HR & Hiring department members and only the caller's records for other payroll employees. `GET /api/payroll/:id` applies the same access scope.
- `PATCH /api/payroll/:id/adjustments` lets admins and HR & Hiring department members update `basicSalary`, `earnings`, or `deductionItems` before payment; all totals are recalculated and a paid record is locked.
- `PATCH /api/payroll/:id/status` accepts `{ "status": "Paid" }` to mark a processed record paid and automatically records the payment date. Status changes cannot be reversed.

Salary data uses the organization's existing MongoDB database. Existing records created before organization-scoped payroll was added do not have an organization or salary-structure snapshot and are not exposed by the new scoped API; review and migrate such historical records before relying on them.

## Existing data checks

- `npm run audit:data` reports archived jobs and legacy applications without changing data. Archived jobs are not automatically republished or converted because the correct previous state cannot be inferred reliably.
- `npm run migrate:resumes` performs a dry run to link an application to a resume only when a screening record matches the exact application, organization, job, and candidate. Review the counts first; pass `-- --apply` to write those unambiguous links. Ambiguous and missing-file records are left for manual review.
- The audit also counts legacy applications without a candidate account. They are not automatically attached to a new candidate login because legacy applications have no verified account relationship; verify the candidate identity before any manual account linkage.
- Permanent job deletion removes job-owned applications, screening results, interviews, email logs, and unreferenced per-application resume files while preserving candidate profiles and other applications. MongoDB replica sets use transactions; local standalone MongoDB uses ordered cleanup with job deletion last because it does not support multi-document transactions.

SMTP sending stays disabled until all SMTP values are provided in `.env`; the email endpoints then record delivery attempts and require an idempotency key to prevent accidental double sends. AI interview invitation links are sent only by email. If SMTP is missing or fails, the invitation is marked failed and can be retried; the raw interview link is not returned to the recruiter UI.

## AI interviews

The AI interview module is a separate submodule within this same Express/MongoDB process; no second server or database is needed. It adds isolated AI-interview collections and a React candidate interview page, while preserving the existing human-interview scheduler and separate resume/ATS service. For setup, API contracts, security limits, and data flow, see [AI_INTERVIEW_ARCHITECTURE.md](../../AI_INTERVIEW_ARCHITECTURE.md). Set `GROQ_INTERVIEW_API_KEY`, `GROQ_INTERVIEW_MODEL`, `PUBLIC_APP_URL`, and SMTP values in the single root `.env`, then restart the local services with `npm run dev`. Interview links are sent only to the candidate's email; configure SMTP before inviting candidates.
