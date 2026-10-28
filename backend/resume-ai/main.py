import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from hiremind_ai.api.resume import router as resume_router
from hiremind_ai.api.job import router as job_router
from hiremind_ai.api.ats_matcher import router as ats_router


app = FastAPI(
    title="HireMind AI",
    description="AI-powered Resume Intelligence and ATS Engine",
    version="1.0.0"
)


cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3001,"
        "http://127.0.0.1:5173,http://127.0.0.1:3001,null"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
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
