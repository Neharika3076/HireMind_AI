from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.models.resume import ResumeProfile
from backend.models.job import JobProfile
from backend.services.ats_matcher import match_candidate


router = APIRouter(
    prefix="/api/ats",
    tags=["ATS Matching"]
)


class ATSMatchRequest(BaseModel):
    resume: ResumeProfile
    job: JobProfile


@router.post("/match")
async def match_resume_to_job(request: ATSMatchRequest):

    try:

        result = match_candidate(
            request.resume,
            request.job
        )

        return {
            "success": True,
            "result": result
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"ATS matching failed: {str(error)}"
        )