from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.resume import router as resume_router
from backend.api.job import router as job_router
from backend.api.ats_matcher import router as ats_router


app = FastAPI(
    title="HireMind AI",
    description="AI-powered Resume Intelligence and ATS Engine",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(resume_router)
app.include_router(job_router)
app.include_router(ats_router)

@app.get("/")
def root():
    return {
        "message": "HireMind AI backend is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }