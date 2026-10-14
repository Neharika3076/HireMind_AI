import os
import json

from dotenv import load_dotenv
from groq import Groq

from backend.models.resume import ResumeProfile


load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is not configured.")

client = Groq(api_key=GROQ_API_KEY)

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

def analyze_resume(resume_text: str) -> ResumeProfile:

    if not resume_text.strip():
        raise ValueError("Resume text is empty.")

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": f"""
Analyze the following resume.

RESUME:
{resume_text}
"""
            }
        ],
        temperature=0
    )

    raw_response = response.choices[0].message.content

    if not raw_response:
        raise ValueError("Groq returned an empty response.")

    try:
        data = json.loads(raw_response)
    except json.JSONDecodeError as error:
        raise ValueError(
            f"Groq returned invalid JSON: {error}"
        )

    return ResumeProfile.model_validate(data)