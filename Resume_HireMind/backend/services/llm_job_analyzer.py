import os
import json
import logging
import re

from dotenv import load_dotenv
from groq import Groq

from backend.models.job import JobProfile


load_dotenv()

DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
requested_model = os.getenv("GROQ_MODEL") or os.getenv("GROQ_INTERVIEW_MODEL")
GROQ_MODEL = requested_model if requested_model and requested_model != "llama-3.1-8b-instant" else DEFAULT_GROQ_MODEL

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is not configured.")

client = Groq(api_key=GROQ_API_KEY)
logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """
You are HireMind AI's Job Description Intelligence Engine.

Your job is to analyze a job description and convert it into
structured recruitment requirements.

IMPORTANT RULES:

1. Extract information explicitly stated in the job description.
2. Also infer requirements that are clearly implied by the role title,
   responsibilities, tools, deliverables, and qualification language. For
   example, a description requiring the candidate to build React interfaces
   implies React as a skill even if there is no separate "Required skills"
   section.
3. Never invent requirements that are not supported or reasonably implied by
   the job description.
4. If a requirement is neither stated nor reasonably implied, use null.
5. For lists with no supported information, return [].
6. Separate required skills from preferred/nice-to-have skills.
7. Extract technical and professional skills from both explicit and implied
   duties, and include evidence showing where each item came from.
8. Extract minimum and preferred years of experience when stated or clearly
   implied by phrases such as "senior", "entry-level", or "2+ years".
9. Extract education requirements when stated or clearly implied by a
   qualification, degree, or field requirement.
10. Extract job responsibilities.
11. Extract certification requirements.
11. Do not evaluate candidates.
12. Do not score candidates.
13. Do not rank candidates.
14. Return ONLY valid JSON.
15. Do NOT use markdown.
16. Do NOT wrap the response in ```json.

------------------------------------------------------------
REQUIRED VS OPTIONAL
------------------------------------------------------------

A requirement is REQUIRED when the job description uses
mandatory language such as:

- required
- must have
- must possess
- minimum qualification
- minimum requirement
- candidates must
- applicant must
- bachelor's degree required
- degree required
- essential
- mandatory

A requirement is OPTIONAL when the job description uses
language such as:

- preferred
- preferably
- nice to have
- nice-to-have
- bonus
- plus
- desirable
- optional
- would be an advantage

Do NOT mark a requirement as optional merely because the
word "required" does not appear immediately next to it.

Use the overall context of the job description.

------------------------------------------------------------
EDUCATION
------------------------------------------------------------

Extract every explicitly stated education requirement.

Each education item MUST have:

{
    "degree": null,
    "field": null,
    "required": true
}

If the job description presents education under a section such as:

- Requirements
- Minimum Qualifications
- Basic Qualifications
- Required Qualifications
- Eligibility
- Qualifications

then treat those education requirements as REQUIRED unless
the text explicitly says they are preferred or optional.

Examples:

"Requirements:
Bachelor's degree in Computer Science"

=> required=true

"Minimum Qualifications:
Bachelor's degree in Computer Science or related field"

=> required=true

"Required:
Bachelor's degree"

=> required=true

"Preferred Qualifications:
Master's degree"

=> required=false

"Master's degree is a plus"

=> required=false

If the job description explicitly says the degree is required,
NEVER return required=false.

------------------------------------------------------------
OUTPUT FORMAT
------------------------------------------------------------

The top-level JSON object MUST contain exactly:

{
    "title": null,
    "company": null,
    "summary": null,
    "skills": [],
    "experience": null,
    "education": [],
    "responsibilities": [],
    "certifications": [
        {
            "name": "Example Certification",
            "required": false,
            "evidence": null
        }
    ]
}
Each skill must have:

{
    "name": "...",
    "category": null,
    "required": true,
    "evidence": null
}

Use required=true for explicitly required skills.

Use required=false for preferred,
optional, bonus, or nice-to-have skills.

Experience must have:

{
    "minimum_years": null,
    "preferred_years": null,
    "description": null
}



Each certification must have:

{
    "name": "...",
    "required": false,
    "evidence": null
}

Use required=true when the job description explicitly
requires the certification.

Use required=false when the certification is preferred,
optional, desirable, or a nice-to-have.

Only extract certifications supported by the job description.
Do not invent certification requirements.


Each education item must have:

{
    "degree": null,
    "field": null,
    "required": true
}

For preferred/optional education,
set required=false.

Never omit the "required" field.
"""


def _content_text(content):
    """Accept both the normal string response and Groq content blocks."""
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict) and part.get("text"):
                parts.append(str(part["text"]))
            elif getattr(part, "text", None):
                parts.append(str(part.text))
        return "".join(parts).strip()
    return str(content or "").strip()


def _parse_json_response(raw_response):
    """Parse JSON even when a model adds a markdown fence or short preface."""
    text = _content_text(raw_response)
    if not text:
        raise ValueError("Groq returned an empty response.")
    text = re.sub(r"^\s*```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```\s*$", "", text)
    start, end = text.find("{"), text.rfind("}")
    if start >= 0 and end > start:
        text = text[start:end + 1]
    try:
        data = json.loads(text)
    except json.JSONDecodeError as error:
        raise ValueError(f"Groq returned invalid JSON: {error}") from error
    if not isinstance(data, dict):
        raise ValueError("Groq returned a JSON value instead of a job profile object.")
    return data


def _text(value):
    if value is None:
        return None
    value = str(value).strip()
    return value or None


def _bool(value, default=False):
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"false", "no", "optional", "preferred", "nice to have"}:
            return False
        if lowered in {"true", "yes", "required", "mandatory"}:
            return True
    return bool(value) if value is not None else default


def _years(value):
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    match = re.search(r"\d+(?:\.\d+)?", str(value))
    return float(match.group()) if match else None


def _items(value):
    if isinstance(value, list):
        return value
    if isinstance(value, dict):
        return [value]
    return [value] if isinstance(value, str) and value.strip() else []


def _normalize_profile(data):
    """Make common LLM shorthand safe for the strict Pydantic profile."""
    normalized = {
        "title": _text(data.get("title")),
        "company": _text(data.get("company")),
        "summary": _text(data.get("summary")),
        "skills": [], "experience": None, "education": [],
        "responsibilities": [], "certifications": [],
    }
    for item in _items(data.get("skills")):
        if isinstance(item, str):
            item = {"name": item}
        if not isinstance(item, dict):
            continue
        name = _text(item.get("name") or item.get("skill") or item.get("technology"))
        if name:
            normalized["skills"].append({
                "name": name, "category": _text(item.get("category")),
                "required": _bool(item.get("required"), True),
                "evidence": _text(item.get("evidence")),
            })
    for item in _items(data.get("education")):
        if isinstance(item, str):
            item = {"degree": item}
        if not isinstance(item, dict):
            continue
        degree = _text(item.get("degree") or item.get("qualification"))
        field = _text(item.get("field") or item.get("major"))
        if degree or field:
            normalized["education"].append({"degree": degree, "field": field, "required": _bool(item.get("required"), False)})
    for item in _items(data.get("certifications")):
        if isinstance(item, str):
            item = {"name": item}
        if not isinstance(item, dict):
            continue
        name = _text(item.get("name") or item.get("certification"))
        if name:
            normalized["certifications"].append({"name": name, "required": _bool(item.get("required"), False), "evidence": _text(item.get("evidence"))})
    for item in _items(data.get("responsibilities")):
        if isinstance(item, dict):
            item = item.get("responsibility") or item.get("description") or item.get("task")
        item = _text(item)
        if item:
            normalized["responsibilities"].append(item)
    experience = data.get("experience")
    if isinstance(experience, str):
        normalized["experience"] = {"description": experience, "minimum_years": _years(experience), "preferred_years": None}
    elif isinstance(experience, dict):
        normalized["experience"] = {
            "minimum_years": _years(experience.get("minimum_years", experience.get("min_years"))),
            "preferred_years": _years(experience.get("preferred_years")),
            "description": _text(experience.get("description")),
        }
    return normalized


def analyze_job_description(job_description: str) -> JobProfile:

    if not job_description.strip():
        raise ValueError("Job description is empty.")

    user_prompt = f"""
Analyze the following job description.

JOB DESCRIPTION:

{job_description}
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
        logger.exception("Groq job-description analysis request failed.")
        raise RuntimeError(f"Groq request failed: {error}") from error

    choice = response.choices[0] if response.choices else None
    message = choice.message if choice else None
    raw_response = _content_text(getattr(message, "content", None))

    # Some provider responses can finish without populating message.content.
    # Retry once with a compact instruction while retaining the same model and
    # constrained JSON response mode.
    if not raw_response:
        logger.warning(
            "Groq returned an empty job-analysis completion (model=%s, finish_reason=%s, refusal=%s, has_reasoning=%s). Retrying once.",
            GROQ_MODEL,
            getattr(choice, "finish_reason", None),
            bool(getattr(message, "refusal", None)),
            bool(getattr(message, "reasoning", None)),
        )
        try:
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "Extract job requirements supported or clearly implied by the description. Return one JSON object only, with keys title, company, summary, skills, experience, education, responsibilities, certifications. Use empty lists and null for unsupported details.",
                    },
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0,
                max_completion_tokens=4096,
                response_format={"type": "json_object"},
            )
        except Exception as error:
            logger.exception("Groq retry for job-description analysis failed.")
            raise RuntimeError(f"Groq retry failed: {error}") from error
        choice = response.choices[0] if response.choices else None
        message = choice.message if choice else None
        raw_response = _content_text(getattr(message, "content", None))
        if not raw_response:
            finish_reason = getattr(choice, "finish_reason", "no_choice")
            refusal = getattr(message, "refusal", None)
            raise RuntimeError(
                "Groq returned an empty job-analysis completion after retry "
                f"(finish_reason={finish_reason}, refusal={bool(refusal)}). "
                "Check Groq model access, account limits, and the FastAPI log."
            )

    data = _normalize_profile(_parse_json_response(raw_response))
    try:
        return JobProfile.model_validate(data)
    except Exception as error:
        logger.exception("Groq returned an invalid normalized job profile.")
        raise ValueError(f"Groq returned an invalid job profile: {error}") from error
