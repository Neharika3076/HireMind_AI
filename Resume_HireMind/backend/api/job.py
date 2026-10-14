from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.services.llm_job_analyzer import analyze_job_description


router = APIRouter(
    prefix="/api/job",
    tags=["Job Description"]
)


class JobDescriptionRequest(BaseModel):
    job_description: str


@router.post("/analyze")
async def analyze_job(request: JobDescriptionRequest):

    try:
        profile = analyze_job_description(
            request.job_description
        )

        return {
            "success": True,
            "profile": profile.model_dump()
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Job description analysis failed: {str(error)}"
        )