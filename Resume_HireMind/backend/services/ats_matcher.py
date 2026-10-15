from typing import List, Dict, Any
import re
from datetime import datetime

from backend.models.resume import ResumeProfile
from backend.models.job import JobProfile
from backend.services.llm_skill_matcher import infer_related_skills


# ============================================================
# SKILL NORMALIZATION
# ============================================================

# ============================================================
# SKILL NORMALIZATION
# ============================================================

SKILL_ALIASES = {

    # Python
    "py": "python",
    "python 3": "python",

    # JavaScript
    "js": "javascript",
    "javascript es6": "javascript",
    "ecmascript": "javascript",

    # TypeScript
    "ts": "typescript",

    # React
    "reactjs": "react",
    "react.js": "react",
    "react js": "react",

    # Node
    "node": "node.js",
    "nodejs": "node.js",
    "node js": "node.js",
    "node.js": "node.js",

    # PostgreSQL
    "postgres": "postgresql",
    "postgres db": "postgresql",
    "postgresql db": "postgresql",
    "postgres database": "postgresql",
    "postgre sql": "postgresql",

    # MongoDB
    "mongo": "mongodb",
    "mongo db": "mongodb",
    "mongo database": "mongodb",

    # REST
    "rest api": "rest",
    "rest apis": "rest",
    "restful api": "rest",
    "restful apis": "rest",
    "rest api development": "rest",

    # Kubernetes
    "k8s": "kubernetes",

    # AWS
    "amazon web services": "aws",

    # GCP
    "google cloud platform": "gcp",

    # Microsoft Azure
    "microsoft azure": "azure",

    # Machine Learning
    "ml": "machine learning",

    # Artificial Intelligence
    "ai": "artificial intelligence",

    # Scikit Learn
    "sklearn": "scikit-learn",
    "scikit learn": "scikit-learn",

    # NumPy
    "numpy": "numpy",
    "num py": "numpy",

    # Pandas
    "pandas library": "pandas",
}

def normalize_skill(skill: str) -> str:

    if not skill:
        return ""

    normalized = skill.lower().strip()

    # Normalize common punctuation
    normalized = normalized.replace("_", " ")
    normalized = normalized.replace("-", " ")
    normalized = normalized.replace(".", "")

    # Normalize whitespace
    normalized = " ".join(
        normalized.split()
    )

    # Apply alias
    normalized = SKILL_ALIASES.get(
        normalized,
        normalized
    )

    return normalized

# ============================================================
# RESUME SKILLS
# ============================================================

def get_resume_skills(resume: ResumeProfile) -> Dict[str, Any]:
    skills = {}

    # Explicit skills
    for skill in resume.skills:
        normalized = normalize_skill(skill.name)

        skills[normalized] = {
            "name": skill.name,
            "evidence": skill.evidence,
            "confidence": skill.confidence,
            "source": "skills",
        }

    # Technologies from professional experience
    for experience in resume.experience:
        for technology in experience.technologies:
            normalized = normalize_skill(technology)

            if normalized not in skills:
                skills[normalized] = {
                    "name": technology,
                    "evidence": experience.description,
                    "confidence": 0.8,
                    "source": "experience",
                }

    # Technologies from projects
    for project in resume.projects:
        for technology in project.technologies:
            normalized = normalize_skill(technology)

            if normalized not in skills:
                skills[normalized] = {
                    "name": technology,
                    "evidence": project.description,
                    "confidence": 0.8,
                    "source": "project",
                }

    return skills


# ============================================================
# SKILL MATCHING
# ============================================================

def match_skills(
    resume: ResumeProfile,
    job: JobProfile,
    use_semantic_matching: bool = False,
) -> Dict[str, Any]:

    resume_skills = get_resume_skills(resume)

    matched_required = []
    missing_required = []

    matched_preferred = []
    missing_preferred = []
    related_required = []
    related_preferred = []
    unmatched_job_skills = []

    for job_skill in job.skills:

        normalized_job_skill = normalize_skill(job_skill.name)

        if normalized_job_skill in resume_skills:

            resume_skill = resume_skills[normalized_job_skill]

            match = {
                "skill": job_skill.name,
                "resume_skill": resume_skill["name"],
                "matched": True,
                "evidence": resume_skill["evidence"],
                "source": resume_skill["source"],
                "confidence": resume_skill["confidence"],
            }

            if job_skill.required:
                matched_required.append(match)
            else:
                matched_preferred.append(match)

        else:
            unmatched_job_skills.append(job_skill)

    resume_skill_entries = list(resume_skills.values())
    if use_semantic_matching:
        semantic_matches, semantic_matching = infer_related_skills(
            resume_skill_entries,
            [
                {
                    "name": skill.name,
                    "category": skill.category,
                    "required": skill.required,
                    "evidence": skill.evidence,
                }
                for skill in unmatched_job_skills
            ],
            {
                "title": job.title,
                "summary": job.summary,
                "responsibilities": job.responsibilities,
            },
        )
    else:
        semantic_matches = {}
        semantic_matching = {"status": "disabled"}

    for local_job_index, job_skill in enumerate(unmatched_job_skills):
        inference = semantic_matches.get(local_job_index)
        if inference:
            resume_skill = resume_skill_entries[inference["resume_skill_index"]]
            related_match = {
                "skill": job_skill.name,
                "resume_skill": resume_skill["name"],
                "match_type": "related",
                "support": inference["support"],
                "score_credit": inference["score_credit"],
                "evidence": inference["explanation"],
                "resume_evidence": resume_skill["evidence"],
                "source": resume_skill["source"],
                "confidence": min(
                    inference["score_credit"],
                    float(resume_skill.get("confidence", 0.5)) * inference["score_credit"],
                ),
            }
            if job_skill.required:
                related_required.append(related_match)
            else:
                related_preferred.append(related_match)
        elif job_skill.required:
            missing_required.append(job_skill.name)
        else:
            missing_preferred.append(job_skill.name)

    return {
        "matched_required": matched_required,
        "missing_required": missing_required,
        "matched_preferred": matched_preferred,
        "missing_preferred": missing_preferred,
        "related_required": related_required,
        "related_preferred": related_preferred,
        "semantic_matching": semantic_matching,
    }


# ============================================================
# EXPERIENCE
# ============================================================

# ============================================================
# EXPERIENCE
# ============================================================

MONTH_NAMES = {
    "jan": 1,
    "january": 1,
    "feb": 2,
    "february": 2,
    "mar": 3,
    "march": 3,
    "apr": 4,
    "april": 4,
    "may": 5,
    "jun": 6,
    "june": 6,
    "jul": 7,
    "july": 7,
    "aug": 8,
    "august": 8,
    "sep": 9,
    "sept": 9,
    "september": 9,
    "oct": 10,
    "october": 10,
    "nov": 11,
    "november": 11,
    "dec": 12,
    "december": 12,
}



def parse_date(value: str | None):
    """
    Convert common resume date formats into (year, month).

    Examples:
        "2022"            -> (2022, 1)
        "2022-05"         -> (2022, 5)
        "May 2022"        -> (2022, 5)
        "May 2022"        -> (2022, 5)
        "Present"         -> current year/month

    If the date cannot be understood, return None.
    """

    if not value:
        return None

    text = value.lower().strip()

    # Current date for "present"
    if any(term in text for term in [
        "present",
        "current",
        "now",
    ]):
        today = datetime.now()
        return today.year, today.month

    # Normalize separators
    text = text.replace("/", " ")
    text = text.replace("-", " ")

    # Look for year
    year_match = re.search(r"\b(19|20)\d{2}\b", text)

    if not year_match:
        return None

    year = int(year_match.group())

    # Look for month name
    month = None

    for name, number in MONTH_NAMES.items():
        if re.search(rf"\b{name}\b", text):
            month = number
            break

    # Numeric month
    if month is None:
        numeric_month = re.search(
            r"\b(0?[1-9]|1[0-2])\b",
            text
        )

        if numeric_month:
            possible_month = int(numeric_month.group())

            # Avoid treating the year as the month
            if possible_month != year:
                month = possible_month

    # If only a year was provided, use January.
    if month is None:
        month = 1

    return year, month


def date_to_month_number(date_tuple):
    """
    Convert (year, month) to an absolute month number.
    This makes interval calculations easy.
    """

    if not date_tuple:
        return None

    year, month = date_tuple

    return year * 12 + (month - 1)


def merge_intervals(intervals):
    """
    Merge overlapping employment intervals.

    Example:

        2022-01 → 2023-12
        2023-01 → 2024-12

    becomes:

        2022-01 → 2024-12

    so overlapping employment isn't double-counted.
    """

    if not intervals:
        return []

    intervals = sorted(
        intervals,
        key=lambda interval: interval[0]
    )

    merged = [intervals[0]]

    for current_start, current_end in intervals[1:]:

        previous_start, previous_end = merged[-1]

        # Overlapping or directly adjacent
        if current_start <= previous_end + 1:

            merged[-1] = (
                previous_start,
                max(previous_end, current_end)
            )

        else:

            merged.append(
                (current_start, current_end)
            )

    return merged


def calculate_professional_experience_months(resume: ResumeProfile) -> int:

    intervals = []

    for experience in resume.experience:

        if not experience.start_date:
            continue

        start = parse_date(
            experience.start_date
        )

        end = parse_date(
            experience.end_date
        )

        if not start:
            continue

        # If no end date exists, treat it as current.
        if not end:
            today = datetime.now()

            end = (
                today.year,
                today.month
            )

        start_month = date_to_month_number(start)
        end_month = date_to_month_number(end)

        if start_month is None or end_month is None:
            continue

        # Ignore invalid intervals.
        if end_month < start_month:
            continue

        intervals.append(
            (
                start_month,
                end_month
            )
        )

    merged_intervals = merge_intervals(intervals)

    total_months = 0

    for start_month, end_month in merged_intervals:

        # +1 because both starting and ending months
        # contain employment.
        total_months += (
            end_month - start_month + 1
        )

    return total_months


def estimate_resume_years(
    resume: ResumeProfile
) -> float:

    total_months = calculate_professional_experience_months(
        resume
    )

    return round(
        total_months / 12,
        1
    )


def match_experience(
    resume: ResumeProfile,
    job: JobProfile
    ) -> Dict[str, Any]:

    candidate_months = (
        calculate_professional_experience_months(
            resume
        )
    )

    candidate_years = round(
        candidate_months / 12,
        1
    )

    required_years = 0

    if (
        job.experience
        and job.experience.minimum_years is not None
    ):
        required_years = job.experience.minimum_years

    # --------------------------------------------------------
    # No experience requirement
    # --------------------------------------------------------

    if required_years <= 0:

        return {
            "required_years": None,
            "candidate_years": candidate_years,
            "candidate_months": candidate_months,
            "matched": True,
            "score": 100,
            "reason": (
                "No minimum professional experience "
                "requirement was specified."
            )
        }

    # --------------------------------------------------------
    # Compare candidate against requirement
    # --------------------------------------------------------

    required_months = round(
        required_years * 12
    )

    matched = (
        candidate_months >= required_months
    )

    if matched:

        score = 100

        reason = (
            f"Estimated {candidate_years} years "
            f"({candidate_months} months) of professional "
            f"experience meets the required "
            f"{required_years} years."
        )

    else:

        score = round(
            (
                candidate_months
                / required_months
            ) * 100
        )

        score = min(
            max(score, 0),
            100
        )

        reason = (
            f"Estimated {candidate_years} years "
            f"({candidate_months} months) of professional "
            f"experience does not meet the required "
            f"{required_years} years."
        )

    return {
        "required_years": required_years,
        "required_months": required_months,
        "candidate_years": candidate_years,
        "candidate_months": candidate_months,
        "matched": matched,
        "score": score,
        "reason": reason,
    }

# ============================================================
# EDUCATION NORMALIZATION
# ============================================================

def normalize_text(value: str | None) -> str:

    if not value:
        return ""

    value = value.lower().strip()

    value = value.replace("&", " and ")
    value = value.replace("/", " ")
    value = value.replace("-", " ")

    value = re.sub(r"[.,()]", " ", value)

    value = " ".join(value.split())

    return value


def normalize_degree(degree: str | None) -> str:

    value = normalize_text(degree)

    if not value:
        return ""

    # Bachelor's family
    if any(term in value for term in [
        "bachelor",
        "b e",
        "be",
        "btech",
        "b tech",
        "b tech degree",
        "b sc",
        "bsc",
        "bca",
    ]):
        return "bachelors"

    # Master's family
    if any(term in value for term in [
        "master",
        "m e",
        "me",
        "mtech",
        "m tech",
        "m sc",
        "msc",
        "mca",
    ]):
        return "masters"

    # PhD
    if any(term in value for term in [
        "phd",
        "doctorate",
        "doctoral",
    ]):
        return "doctorate"

    return value


def normalize_field(field: str | None) -> str:

    value = normalize_text(field)

    if not value:
        return ""

    # Artificial Intelligence / Machine Learning
    if any(term in value for term in [
        "artificial intelligence",
        "machine learning",
        "ai ml",
        "ai machine learning",
        "artificial intelligence machine learning",
    ]):
        return "computer science related"

    # Computer Science
    if any(term in value for term in [
        "computer science",
        "computer engineering",
        "computing",
        "software engineering",
        "information technology",
        "information science",
        "data science",
        "artificial intelligence",
        "machine learning",
    ]):
        return "computer science related"

    # Electronics / Electrical
    if any(term in value for term in [
        "electronics",
        "electrical engineering",
        "electrical",
    ]):
        return "engineering"

    return value


def degree_matches(
    candidate_degree: str | None,
    required_degree: str | None
) -> bool:

    candidate = normalize_degree(candidate_degree)
    required = normalize_degree(required_degree)

    if not required:
        return True

    if not candidate:
        return False

    return candidate == required


def field_matches(
    candidate_field: str | None,
    required_field: str | None
) -> bool:

    required = normalize_field(required_field)
    candidate = normalize_field(candidate_field)

    if not required:
        return True

    if not candidate:
        return False

    # Explicit related-field requirement
    if "related" in required:
        if candidate == "computer science related":
            return True

    return candidate == required


# ============================================================
# EDUCATION MATCHING
# ============================================================

def match_education(
    resume: ResumeProfile,
    job: JobProfile
) -> Dict[str, Any]:

    # --------------------------------------------------------
    # No education requirement
    # --------------------------------------------------------

    required_requirements = [
        requirement
        for requirement in job.education
        if requirement.required
    ]

    if not required_requirements:

        return {
            "required": False,
            "matched": None,
            "score": 0,
            "matched_requirements": [],
            "missing_requirements": [],
            "evidence": [],
            "reason": "Education requirement not specified for this opening."
        }

    matched_requirements = []
    missing_requirements = []
    evidence = []

    # --------------------------------------------------------
    # Check every required education requirement
    # --------------------------------------------------------

    for requirement in required_requirements:

        requirement_label = " ".join(
            filter(
                None,
                [
                    requirement.degree,
                    requirement.field,
                ]
            )
        )

        requirement_matched = False

        for education in resume.education:

            degree_match = degree_matches(
                education.degree,
                requirement.degree
            )

            field_match = field_matches(
                education.field,
                requirement.field
            )

            # Both specified components must match.
            if degree_match and field_match:

                requirement_matched = True

                matched_requirements.append(
                    requirement_label
                )

                evidence.append({
                    "requirement": requirement_label,
                    "candidate_degree": education.degree,
                    "candidate_field": education.field,
                    "institution": education.institution,
                    "reason": (
                        "Candidate education matches the required "
                        "degree and field."
                    )
                })

                break

        if not requirement_matched:

            missing_requirements.append(
                requirement_label
            )

    # --------------------------------------------------------
    # Score
    # --------------------------------------------------------

    total_required = len(required_requirements)

    matched_count = len(matched_requirements)

    score = round(
        (matched_count / total_required) * 100
    )

    return {
        "required": True,
        "matched": matched_count == total_required,
        "score": score,
        "matched_requirements": matched_requirements,
        "missing_requirements": missing_requirements,
        "evidence": evidence,
        "reason": (
            "All required education requirements were matched."
            if matched_count == total_required
            else
            "One or more required education requirements "
            "were not found in the submitted resume."
        )
    }


# ============================================================
# OVERALL SCORE
# ============================================================

def calculate_overall_score(
    skill_result,
    experience_result,
    education_result,
    job
):
    """
    Calculate the candidate's overall ATS compatibility score.

    Weighting:
        Required skills  = 55%
        Experience       = 25%
        Education        = 10%
        Preferred skills = 10%

    The score represents evidence-based compatibility.
    It is NOT a hiring decision.
    """

    required_skills = [
        skill
        for skill in job.skills
        if skill.required
    ]

    preferred_skills = [
        skill
        for skill in job.skills
        if not skill.required
    ]

    required_count = len(required_skills)
    matched_required = sum(
        float(match.get("score_credit", 1))
        for match in skill_result["matched_required"] + skill_result.get("related_required", [])
    )
    preferred_count = len(preferred_skills)
    matched_preferred = sum(
        float(match.get("score_credit", 1))
        for match in skill_result["matched_preferred"] + skill_result.get("related_preferred", [])
    )
    minimum_years = float((job.experience.minimum_years if job.experience else 0) or 0)
    preferred_years = float((job.experience.preferred_years if job.experience else 0) or 0)
    if minimum_years > 0:
        experience_score = float(experience_result["score"])
    elif preferred_years > 0:
        experience_score = min(100.0, float(experience_result["candidate_years"]) / preferred_years * 100)
    else:
        experience_score = 0.0
    required_education_count = sum(1 for requirement in job.education if requirement.required)

    # A component is scored only if the job explicitly asks for it. Missing job
    # criteria are excluded, not treated as a perfect candidate match.
    components = []
    if required_count:
        components.append((matched_required / required_count * 100, 55))
    if minimum_years > 0 or preferred_years > 0:
        components.append((experience_score, 25))
    if required_education_count:
        components.append((float(education_result["score"]), 10))
    if preferred_count:
        components.append((matched_preferred / preferred_count * 100, 10))

    active_weight = sum(weight for _score, weight in components)
    if not active_weight:
        return 0
    return round(sum(score * weight for score, weight in components) / active_weight)

def build_score_breakdown(
    skill_result,
    experience_result,
    education_result,
    job
):
    required_skills = [
        skill
        for skill in job.skills
        if skill.required
    ]

    preferred_skills = [
        skill
        for skill in job.skills
        if not skill.required
    ]

    required_count = len(required_skills)

    direct_matched_required = len(skill_result["matched_required"])
    related_required = skill_result.get("related_required", [])
    matched_required = sum(
        float(match.get("score_credit", 1))
        for match in skill_result["matched_required"] + related_required
    )

    preferred_count = len(preferred_skills)

    direct_matched_preferred = len(skill_result["matched_preferred"])
    related_preferred = skill_result.get("related_preferred", [])
    matched_preferred = sum(
        float(match.get("score_credit", 1))
        for match in skill_result["matched_preferred"] + related_preferred
    )

    required_skill_score = round(matched_required / required_count * 100) if required_count else 0
    preferred_skill_score = round(matched_preferred / preferred_count * 100) if preferred_count else 0
    minimum_years = float((job.experience.minimum_years if job.experience else 0) or 0)
    preferred_years = float((job.experience.preferred_years if job.experience else 0) or 0)
    education_count = sum(1 for requirement in job.education if requirement.required)
    active = {
        "required_skills": required_count > 0,
        "experience": minimum_years > 0 or preferred_years > 0,
        "education": education_count > 0,
        "preferred_skills": preferred_count > 0,
    }
    base_weights = {"required_skills": 55, "experience": 25, "education": 10, "preferred_skills": 10}
    active_total = sum(base_weights[key] for key, enabled in active.items() if enabled)
    weights = {key: round(base_weights[key] / active_total * 100) if active[key] and active_total else 0 for key in active}
    if active_total and sum(weights.values()) != 100:
        first_active = next(key for key in active if active[key])
        weights[first_active] += 100 - sum(weights.values())
    experience_score = float(experience_result["score"]) if minimum_years > 0 else (min(100.0, float(experience_result["candidate_years"]) / preferred_years * 100) if preferred_years > 0 else 0)

    return {
        "required_skills": {
            "score": required_skill_score,
            "weight": weights["required_skills"],
            "active": active["required_skills"],
            "matched": direct_matched_required,
            "related": len(related_required),
            "earned_credit": round(matched_required, 2),
            "total": required_count,
        },

        "experience": {
            "score": round(experience_score),
            "weight": weights["experience"],
            "active": active["experience"],
            "candidate_years": experience_result[
                "candidate_years"
            ],
            "required_years": experience_result[
                "required_years"
            ],
        },

        "education": {
            "score": education_result["score"] if active["education"] else 0,
            "weight": weights["education"],
            "active": active["education"],
        },

        "preferred_skills": {
            "score": preferred_skill_score,
            "weight": weights["preferred_skills"],
            "active": active["preferred_skills"],
            "matched": direct_matched_preferred,
            "related": len(related_preferred),
            "earned_credit": round(matched_preferred, 2),
            "total": preferred_count,
        },
    }
    
def identify_critical_gaps(
    skill_result,
    experience_result,
    education_result
):
    critical_gaps = []

    # Required skills
    for skill in skill_result["missing_required"]:
        critical_gaps.append({
            "type": "required_skill",
            "requirement": skill,
            "severity": "high",
            "message": (
                f"Required skill not found in "
                f"submitted resume: {skill}"
            )
        })

    # Experience
    if not experience_result["matched"]:
        critical_gaps.append({
            "type": "experience",
            "requirement": (
                f"{experience_result['required_years']} years"
            ),
            "severity": "high",
            "message": experience_result["reason"]
        })

    # Education
    if (
        education_result["required"]
        and not education_result["matched"]
    ):
        for requirement in education_result[
            "missing_requirements"
        ]:
            critical_gaps.append({
                "type": "education",
                "requirement": requirement,
                "severity": "medium",
                "message": (
                    "Required education not found in "
                    "submitted resume: "
                    + requirement
                )
            })

    return critical_gaps


def assess_role_alignment(resume: ResumeProfile, job: JobProfile) -> Dict[str, Any]:
    """Flag clear design-vs-software role-family conflicts without fuzzy skill credit."""
    job_text = " ".join([
        job.title or "", job.summary or "", *job.responsibilities,
        *(skill.name for skill in job.skills),
    ]).lower()
    resume_text_parts = [resume.professional_summary or ""]
    resume_text_parts.extend(item.role or "" for item in resume.experience)
    resume_text_parts.extend(item.description or "" for item in resume.experience)
    resume_text_parts.extend(item.name or "" for item in resume.projects)
    resume_text_parts.extend(item.description or "" for item in resume.projects)
    resume_text_parts.extend(skill.name for skill in resume.skills)
    resume_text_parts.extend(technology for item in resume.experience for technology in item.technologies)
    resume_text = " ".join(resume_text_parts).lower()

    design_terms = ("designer", "design", "ux", "ui/ux", "user experience", "figma", "prototyping", "visual design")
    resume_design_terms = ("designer", "product design", "ux", "ui/ux", "user experience", "figma", "sketch app", "prototyping", "visual design", "user research", "interaction design", "graphic design")
    software_terms = ("software developer", "software engineer", "web developer", "frontend developer", "front-end developer", "backend developer", "back-end developer", "full stack", "full-stack", "programmer")
    target_is_design = any(term in job_text for term in design_terms)
    resume_is_software = any(term in resume_text for term in software_terms)
    resume_has_design_evidence = any(term in resume_text for term in resume_design_terms)

    if target_is_design and resume_is_software and not resume_has_design_evidence:
        return {
            "aligned": False,
            "target_family": "design",
            "candidate_family": "software development",
            "reason": "The job is design-focused, while the resume evidence identifies software-development experience and no design skills or design work.",
            "score_cap": 25,
        }
    return {"aligned": True, "target_family": None, "candidate_family": None, "reason": "No clear role-family conflict was detected.", "score_cap": None}


# ============================================================
# FINAL MATCH
# ============================================================

def match_candidate(
    resume: ResumeProfile,
    job: JobProfile,
    use_semantic_matching: bool = False,
) -> Dict[str, Any]:

    skill_result = match_skills(
        resume,
        job,
        use_semantic_matching=use_semantic_matching,
    )

    experience_result = match_experience(
        resume,
        job
    )

    education_result = match_education(
        resume,
        job
    )

    overall_score = calculate_overall_score(
        skill_result,
        experience_result,
        education_result,
        job
    )
    role_alignment = assess_role_alignment(resume, job)
    if not role_alignment["aligned"]:
        overall_score = min(overall_score, role_alignment["score_cap"])

    score_breakdown = build_score_breakdown(
    skill_result,
    experience_result,
    education_result,
    job
    )

    critical_gaps = identify_critical_gaps(
        skill_result,
        experience_result,
        education_result
    )
    strengths = []
    gaps = []
    if not role_alignment["aligned"]:
        gaps.append(role_alignment["reason"])

    # --------------------------------------------------------
    # Strengths
    # --------------------------------------------------------

    for match in skill_result["matched_required"]:

        strengths.append(
            f"Required skill found: {match['skill']}"
        )

    for match in skill_result["matched_preferred"]:

        strengths.append(
            f"Preferred skill found: {match['skill']}"
        )

    if experience_result["matched"]:

        strengths.append(
            experience_result["reason"]
        )

    if education_result["matched"]:

        if education_result["matched_requirements"]:

            strengths.append(
                "Required education appears to match."
            )

    # --------------------------------------------------------
    # Gaps
    # --------------------------------------------------------

    for skill in skill_result["missing_required"]:

        gaps.append(
            f"Required skill not found in submitted resume: {skill}"
        )

    for skill in skill_result["missing_preferred"]:

        gaps.append(
            f"Preferred skill not found in submitted resume: {skill}"
        )

    if not experience_result["matched"]:

        gaps.append(
            experience_result["reason"]
        )

    for education in education_result["missing_requirements"]:

        gaps.append(
            "Required education not found in submitted resume: "
            + education
        )

    return {
        "overall_score": overall_score,

        "score_algorithm_version": 4,
        "role_alignment": role_alignment,
        "score_note": (role_alignment["reason"] + " The compatibility score is capped because of this clear role mismatch." if not role_alignment["aligned"] else ("No explicit skills, experience, or education criteria were set for this opening; the score is 0 until job requirements are provided." if not any(item["active"] for item in score_breakdown.values()) else "Score is based only on criteria explicitly specified for this job. Missing candidate evidence does not receive credit.")),

        "score_breakdown": score_breakdown,

        "skill_analysis": {
            "matched_required": skill_result["matched_required"],
            "related_required": skill_result.get("related_required", []),
            "missing_required": skill_result["missing_required"],
            "matched_preferred": skill_result["matched_preferred"],
            "related_preferred": skill_result.get("related_preferred", []),
            "missing_preferred": skill_result["missing_preferred"],
            "semantic_matching": skill_result.get("semantic_matching", {"status": "not_needed"}),
        },

        "experience_analysis": experience_result,

        "education_analysis": education_result,

        "critical_gaps": critical_gaps,

        "strengths": strengths,

        "gaps": gaps,
    }   
