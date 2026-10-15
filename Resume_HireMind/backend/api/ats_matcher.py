from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

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

        result = await run_in_threadpool(
            match_candidate,
            request.resume,
            request.job,
            use_semantic_matching=True,
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
