from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging

from backend.services.llm_job_analyzer import analyze_job_description

logger = logging.getLogger(__name__)


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
        logger.exception("Job description analysis failed.")
        raise HTTPException(
            status_code=502,
            detail=f"Job description analysis failed: {str(error)}"
        )
