import os
import json
import logging
import re

from dotenv import load_dotenv
from groq import Groq

from backend.models.resume import ResumeProfile


load_dotenv()

# Prevent double '/openai/v1' path issue if GROQ_BASE_URL is set to 'https://api.groq.com/openai/v1'
if os.getenv("GROQ_BASE_URL", "").rstrip("/").endswith("/openai/v1"):
    del os.environ["GROQ_BASE_URL"]

GROQ_API_KEY = os.getenv("GROQ_API_KEY") or os.getenv("GROQ_INTERVIEW_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL") or os.getenv("GROQ_INTERVIEW_MODEL", "openai/gpt-oss-20b")

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is not configured.")

client = Groq(api_key=GROQ_API_KEY)
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
You are HireMind AI's Resume Intelligence Engine.

Your task is to analyze a candidate's resume and extract
structured recruitment information.

IMPORTANT RULES:

1. Only extract information explicitly supported by the resume.
2. Never invent information.
3. If information is unavailable, use null.
4. For lists with no information, return [].
5. Do not return null for list fields.
6. Separate professional experience from projects.
7. Extract technical and professional skills.
8. Preserve important details from work experience.
9. Extract education, certifications and languages.
10. For skills, provide evidence from the resume when possible.
11. Confidence must be between 0 and 1.
12. Do not infer sensitive personal characteristics.
13. Do not make hiring decisions.
14. Do not score or rank the candidate.
15. Return ONLY valid JSON.
16. Do NOT add markdown.
17. Do NOT add ```json or ``` around the response.
18. The top-level JSON object MUST contain exactly these fields:

{
    "candidate": {
        "name": null,
        "email": null,
        "phone": null,
        "location": null
    },
    "professional_summary": null,
    "skills": [],
    "education": [],
    "experience": [],
    "projects": [],
    "certifications": [],
    "languages": []
}

The certifications and languages fields MUST contain strings only. Do not
return certification objects with confidence or evidence keys.

The candidate object MUST always exist.

Each skill must have:

{
    "name": "...",
    "category": null,
    "evidence": null,
    "confidence": 0.0
}

Each education item must have:

{
    "degree": null,
    "field": null,
    "institution": null,
    "start_date": null,
    "end_date": null,
    "description": null
}

Each experience item must have:

{
    "company": null,
    "role": null,
    "start_date": null,
    "end_date": null,
    "description": null,
    "technologies": []
}

Each project item must have:

{
    "name": null,
    "description": null,
    "technologies": []
}
"""


def _content_text(content):
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        return "".join(
            part if isinstance(part, str) else str(part.get("text", "")) if isinstance(part, dict)
            else str(getattr(part, "text", ""))
            for part in content
        ).strip()
    return str(content or "").strip()


def _parse_json_response(content):
    text = _content_text(content)
    if not text:
        raise ValueError("Groq returned an empty resume-analysis response.")
    text = re.sub(r"^\s*```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```\s*$", "", text)
    start, end = text.find("{"), text.rfind("}")
    if start >= 0 and end > start:
        text = text[start:end + 1]
    try:
        data = json.loads(text)
    except json.JSONDecodeError as error:
        raise ValueError(f"Groq returned invalid resume JSON: {error}") from error
    if not isinstance(data, dict):
        raise ValueError("Groq returned a JSON value instead of a resume profile object.")
    return data


def _normalize_resume_profile(data):
    """Normalize equivalent LLM list formats to the ResumeProfile schema."""
    for field in ("certifications", "languages"):
        values = data.get(field)
        if not isinstance(values, list):
            values = [values] if values else []

        normalized = []
        for value in values:
            if isinstance(value, dict):
                # Groq can include evidence/confidence alongside a certificate;
                # the persisted profile only needs the human-readable name.
                value = value.get("name") or value.get("certification") or value.get("title")
            if isinstance(value, str) and value.strip():
                normalized.append(value.strip())
        data[field] = normalized

    return data


def analyze_resume(resume_text: str) -> ResumeProfile:

    if not resume_text.strip():
        raise ValueError("Resume text is empty.")

    user_prompt = f"""
Analyze the following resume.

RESUME:
{resume_text}
"""
    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0,
            max_completion_tokens=4096,
            response_format={"type": "json_object"},
        )
    except Exception as error:
        logger.exception("Groq resume-analysis request failed.")
        raise RuntimeError(f"Groq resume request failed: {error}") from error

    choice = response.choices[0] if response.choices else None
    message = choice.message if choice else None
    raw_response = _content_text(getattr(message, "content", None))
    if not raw_response:
        logger.warning(
            "Groq returned an empty resume-analysis completion (model=%s, finish_reason=%s, refusal=%s). Retrying once.",
            GROQ_MODEL, getattr(choice, "finish_reason", None), bool(getattr(message, "refusal", None)),
        )
        try:
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "Extract resume facts into one JSON object with candidate, professional_summary, skills, education, experience, projects, certifications, and languages. Use empty lists or null for missing facts. Do not invent facts.",
                    },
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0,
                max_completion_tokens=4096,
                response_format={"type": "json_object"},
            )
        except Exception as error:
            logger.exception("Groq retry for resume analysis failed.")
            raise RuntimeError(f"Groq resume retry failed: {error}") from error
        choice = response.choices[0] if response.choices else None
        message = choice.message if choice else None
        raw_response = _content_text(getattr(message, "content", None))
        if not raw_response:
            raise RuntimeError(
                "Groq returned an empty resume-analysis completion after retry "
                f"(finish_reason={getattr(choice, 'finish_reason', 'no_choice')}, "
                f"refusal={bool(getattr(message, 'refusal', None))})."
            )

    data = _normalize_resume_profile(_parse_json_response(raw_response))
    try:
        return ResumeProfile.model_validate(data)
    except Exception as error:
        logger.exception("Groq returned a resume profile that failed validation.")
        raise ValueError(f"Groq returned an invalid resume profile: {error}") from error
