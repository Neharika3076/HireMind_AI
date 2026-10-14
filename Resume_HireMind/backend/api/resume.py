import os
import tempfile
import logging
import re

from fastapi import APIRouter, UploadFile, File, HTTPException

from backend.services.resume_parser import extract_resume

from backend.services.llm_resume_analyzer import analyze_resume

router = APIRouter(
    prefix="/api/resume",
    tags=["Resume"]
)
logger = logging.getLogger(__name__)


def looks_like_resume(text: str) -> bool:
    """Reject arbitrary readable documents before asking the LLM to profile them."""
    normalized = re.sub(r"\s+", " ", text).strip().lower()
    if len(normalized) < 120:
        return False

    has_contact = bool(re.search(r"[\w.+-]+@[\w.-]+\.[a-z]{2,}", normalized)) or bool(
        re.search(r"(?:\+?\d[\d\s().-]{7,}\d)", normalized)
    )
    sections = (
        r"\bskills?\b", r"\b(?:work )?experience\b", r"\bemployment history\b",
        r"\beducation\b", r"\bprojects?\b", r"\bcertifications?\b",
        r"\bprofessional summary\b", r"\bcareer objective\b", r"\bprofile\b",
        r"\btechnical expertise\b", r"\bwork history\b",
    )
    section_count = sum(bool(re.search(pattern, normalized)) for pattern in sections)
    return (has_contact and section_count >= 2) or (section_count >= 3 and len(normalized) >= 350)


@router.post("/extract")
async def extract_resume_api(
    file: UploadFile = File(...)
):
    """
    Upload a resume and extract its raw text.
    """

    allowed_extensions = {".pdf", ".docx"}

    filename = file.filename or ""

    extension = os.path.splitext(filename)[1].lower()

    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are supported."
        )

    file_content = await file.read()

    if not file_content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty."
        )

    temp_path = None

    try:

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension
        ) as temp_file:

            temp_file.write(file_content)
            temp_path = temp_file.name

        extracted_text = extract_resume(temp_path)

        if not extracted_text or not extracted_text.strip():
            raise HTTPException(
                status_code=422,
                detail=(
                    "No readable text was found in this resume. If it is a scanned PDF, "
                    "run OCR on it and upload the searchable PDF."
                )
            )

        if not looks_like_resume(extracted_text):
            raise HTTPException(
                status_code=422,
                detail=(
                    "This file does not look like a resume. Upload a CV with your name or contact details and sections such as skills, experience, education, or projects."
                )
            )

        profile = analyze_resume(extracted_text)

        return {
            "success": True,
            "filename": filename,
            "file_size": len(file_content),
            "text": extracted_text,
            "characters": len(extracted_text),
            "words": len(extracted_text.split()),
            "profile": profile.model_dump()
        }

    except HTTPException:
        raise

    except Exception as error:
        logger.error("Resume processing failed (%s).", type(error).__name__)

        raise HTTPException(
            status_code=500,
            detail="Resume processing failed. Check the FastAPI terminal for details and confirm the AI service is configured."
        )

    finally:

        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
