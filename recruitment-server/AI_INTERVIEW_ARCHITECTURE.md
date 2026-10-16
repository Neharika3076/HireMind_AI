# AI interview module

## Boundaries

The interview system is an isolated module within the existing Express recruitment process. It uses the recruitment service's existing MongoDB connection and tenant identifier, but its own `aiinterviewtemplates`, `aiinterviewinvitations`, `aiinterviewsessions`, `aiinterviewreports`, and `aiinterviewintegrityevents` collections. This keeps deployment simple without pretending that a second process is required.

The existing `RecruitmentInterview` collection and `/api/recruitment/interviews` endpoints remain for human interview scheduling. The new AI module does not modify `Resume_HireMind/backend`, resume extraction, job analysis, ATS scoring, or the application upload workflow. It reads only the candidate's saved profile fields needed to tailor job questions; contact fields and resume files are not sent to Groq.

The module has independently testable question generation, answer evaluation, follow-up generation, scoring, invitation delivery, session orchestration, integrity monitoring, and report services under `src/ai-interviews/services/`.

## End-to-end data flow

1. A recruiter selects an active application in Screening. The server requires a completed resume screen, an active application, and an organization-scoped job/candidate. ATS rank is not an automatic pass/fail rule; a recruiter makes the explicit invitation decision.
2. The invitation service stores an organization/application/job/candidate reference, a template/rubric snapshot, an expiry, and only the SHA-256 hash of a random invitation secret. It emails the secure link using the existing SMTP provider and records delivery in the existing `RecruitmentEmailLog`. The raw link is never returned to the recruiter UI. A failed delivery is labeled failed and can be retried; it is never reported as sent.
3. The email opens `ai-interview.html`. The secret is in the URL fragment, not a query string or server request URL. The candidate sees the job and privacy notice and must consent before session creation. They may request an alternative assessment without penalty.
4. The session service passes a limited job profile and relevant candidate-profile fields to the configured Groq model. It stores a fixed 5-question plan (bounded to 3–8 questions) and rubric version. The candidate receives only the current prompt and progress, not the criteria, reference answers, scores, or recruiter notes.
5. Each answer is saved before evaluation. The evaluator returns schema-validated criterion scores, answer evidence, missing concepts, factual-error flags, confidence, and a bounded follow-up recommendation. A failed evaluation stays failed/pending and can be retried; it is not converted into a zero. At most two follow-ups are asked for the whole interview.
6. Completion creates a private report for recruiters. The score is the rounded mean across validated 0–4 criterion scores, normalized to 0–100; confidence is the mean model confidence. Integrity signals never affect this score. The report is decision support only and requires human review.
7. Invitation, session, report, and integrity records are tenant-scoped and have TTL retention fields. The default retention is 90 days for completed interview data (`AI_INTERVIEW_RETENTION_DAYS` can raise/lower it, minimum 30). Recruiter job deletion removes associated AI interview data along with its applications.

## API contracts

Recruiter endpoints are mounted below `/api/recruitment/ai-interviews` and use the existing recruiter headers/auth middleware. Every lookup is constrained by the authenticated request's `organizationId`.

| Method and path | Purpose |
|---|---|
| `GET /templates` | List active organization interview templates (creates the default template if absent). |
| `GET /jobs/:jobId/invitations` | Get invitation statuses for a job; never returns token hashes or links. |
| `GET /applications/:applicationId/invitations` | Get invitation statuses for one application. |
| `POST /applications/:applicationId/invitations` | Create a recruiter-selected invitation; body accepts `templateKey` and `expiresInDays` (1–30). |
| `POST /invitations/:id/resend` | Rotate the secret and email a renewed secure link. |
| `DELETE /invitations/:id` | Revoke access and cancel an in-progress session. |
| `GET /invitations/:id/report` | Return completed answers, validated evidence, score, review history, and separate integrity events. |
| `POST /invitations/:id/review` | Body: `{decision, note}`; records a human decision but does not automatically change application status. |
| `PATCH /integrity/:eventId` | Body: `{reviewStatus: "reviewed"|"not_concerning"}`. |

Candidate endpoints are mounted below `/api/recruitment/public/ai-interviews`. Invitation/session secrets are sent in the `Authorization: Bearer …` header. Candidate endpoints are rate-limited and return `Cache-Control: no-store`.

| Method and path | Purpose |
|---|---|
| `GET /invite` | Validate invitation token and return safe job/privacy information. |
| `POST /start` | Requires `{consent:true, focusMonitoringAccepted:boolean}`; creates or resumes a session and returns its bearer token. |
| `GET /session` | Recover progress using the session bearer. |
| `POST /answer` | Body: `{questionId, answer}`; saves and evaluates the current prompt. |
| `POST /integrity` | Body type is `tab_focus_lost` or `connection_interrupted`; only records focus signals when optional monitoring was accepted. |
| `POST /alternative` | Body: `{reason}`; marks an alternative assessment request. |
| `POST /candidate/status` | Existing candidate account credentials; returns invitation status only, never scores, links, or answers. |

Errors use `{error: string}` and appropriate HTTP statuses: `400` invalid input, `401` invalid candidate credentials/recruiter session, `403` insufficient recruiter access, `404` unknown resource, `409` invalid workflow state, `410` expired/revoked invitation, `429` rate-limited, `503` provider/email temporarily unavailable. Evaluation/provider failures preserve the saved candidate answer.

## Model, email, and local setup

The interview module calls Groq from the recruitment server; the browser never sees its API key. Set `GROQ_INTERVIEW_API_KEY` in `recruitment-server/.env`. If you want the interview and resume analyzer to use the same model, set `GROQ_INTERVIEW_MODEL` to the exact model ID configured for `Resume_HireMind/backend`; the Node and Python processes read their own environment files, so values must be configured in both. The default is `openai/gpt-oss-20b`. The prior `llama-3.1-8b-instant` default is deprecated on Groq for non-enterprise usage; see [Groq's model deprecation table](https://console.groq.com/docs/deprecations) and [GPT-OSS 20B model page](https://console.groq.com/docs/model/openai/gpt-oss-20b). JSON Object Mode is used for model output, then every result is validated again by the module.

Set `PUBLIC_APP_URL` to the origin serving HireMind pages (local default `http://127.0.0.1:3001`) so mailed links open `ai-interview.html`. Configure SMTP with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`; without valid SMTP configuration, invitations fail and no link is exposed in the UI. After changing env values, restart the existing service from `recruitment-server` with `npm run dev`; no second server or new dependency is required. Open recruiter UI via the same local-origin/session path you already use.

## Integrity and privacy limits

This first version is text-only: it does not request a camera or microphone and does not record the screen. Optional technical monitoring records only that the interview page became hidden and that connectivity was interrupted and recovered. It cannot identify another tab, app, device, or the reason for a focus change. Signals are stored separately, shown for human review, and never alter technical scores or automatically reject a candidate. A candidate can request an alternative assessment without a score penalty.

The current EMS authentication bridge trusts browser-supplied organization headers only in development and intentionally fails closed in production. Therefore this feature inherits that production blocker; do not deploy the recruiter API publicly until the EMS has server-verified sessions and tenant membership authorization. Candidate email ownership verification is also an existing platform limitation.
