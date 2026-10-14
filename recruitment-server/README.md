# HireMind recruitment service

This is a separate Express service for recruitment data. It uses its own MongoDB collections (`recruitmentjobs`, `recruitmentcandidates`, `recruitmentapplications`, `recruitmentscreeningresults`, `recruitmentinterviews`, `recruitmentactivities`, and `recruitmentemaillogs`) and never exposes the private resume-upload directory as a static URL.

## Run locally

1. Start MongoDB locally, or set `MONGODB_URI` to a MongoDB instance you control.
2. Copy `.env.example` to `.env` and set any required values. Keep secrets only in `.env`.
3. In this folder, run `npm install` and then `npm run dev`.
4. Start the existing AI service separately from `Resume_HireMind/backend` (normally `uvicorn main:app --reload --port 8000`).
5. If you normally open HireMind as `file:///...`, keep doing that and open `recruitment.html` from the same folder after signing in. The dashboard will call the local service at port 3001. If you prefer the HTTP version, sign in through `http://127.0.0.1:3001/login.html` first, then open `http://127.0.0.1:3001/recruitment.html`; browser sessions are separated by origin.

The current HireMind EMS uses browser-local authentication only. Therefore the recruitment UI passes the signed-in user's organization and role through request headers as a **development bridge**. This is appropriate only for the class local-storage prototype. Before a public deployment, replace it with server-verified authentication and a proper user/organization database.

SMTP sending stays disabled until all SMTP values are provided in `.env`; the email endpoints then record delivery attempts and require an idempotency key to prevent accidental double sends.
