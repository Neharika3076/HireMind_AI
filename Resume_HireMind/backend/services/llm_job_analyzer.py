import os
import json

from dotenv import load_dotenv
from groq import Groq

from backend.models.job import JobProfile


load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is not configured.")

client = Groq(api_key=GROQ_API_KEY)


SYSTEM_PROMPT = """
You are HireMind AI's Job Description Intelligence Engine.

Your job is to analyze a job description and convert it into
structured recruitment requirements.

IMPORTANT RULES:

1. Only extract information supported by the job description.
2. Never invent requirements.
3. If information is unavailable, use null.
4. For lists with no information, return [].
5. Separate required skills from preferred/nice-to-have skills.
6. Extract technical and professional skills.
7. Extract minimum and preferred years of experience when stated.
8. Extract education requirements.
9. Extract job responsibilities.
10. Extract certification requirements.
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


def analyze_job_description(job_description: str) -> JobProfile:

    if not job_description.strip():
        raise ValueError("Job description is empty.")

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
Analyze the following job description.

JOB DESCRIPTION:

{job_description}
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

    return JobProfile.model_validate(data)