from backend.models.resume import (
    ResumeProfile,
    CandidateInfo,
    Skill,
    Education,
    Experience,
)

from backend.models.job import (
    JobProfile,
    JobSkill,
    JobExperience,
    JobEducation,
)

from backend.services.ats_matcher import match_candidate


# ============================================================
# TEST JOB
# ============================================================

def create_test_job():

    return JobProfile(
        title="Backend Developer",

        skills=[
            JobSkill(
                name="Python",
                required=True
            ),
            JobSkill(
                name="FastAPI",
                required=True
            ),
            JobSkill(
                name="PostgreSQL",
                required=True
            ),
            JobSkill(
                name="REST APIs",
                required=True
            ),
            JobSkill(
                name="Docker",
                required=False
            ),
            JobSkill(
                name="AWS",
                required=False
            ),
        ],

        experience=JobExperience(
            minimum_years=2
        ),

        education=[
            JobEducation(
                degree="Bachelor's",
                field="Computer Science or related field",
                required=True
            )
        ]
    )


# ============================================================
# TEST 1
# Perfect candidate
# ============================================================

def test_perfect_candidate():

    resume = ResumeProfile(

        candidate=CandidateInfo(
            name="Perfect Candidate"
        ),

        skills=[
            Skill(name="Python"),
            Skill(name="FastAPI"),
            Skill(name="PostgreSQL"),
            Skill(name="REST APIs"),
            Skill(name="Docker"),
            Skill(name="AWS"),
        ],

        education=[
            Education(
                degree="B.E.",
                field="Computer Science",
                institution="Test University"
            )
        ],

        experience=[
            Experience(
                company="Company A",
                role="Backend Developer",
                start_date="2021-01",
                end_date="2024-01"
            )
        ]
    )

    job = create_test_job()

    result = match_candidate(
        resume,
        job
    )

    assert result["overall_score"] >= 90

    assert len(
        result["skill_analysis"]["missing_required"]
    ) == 0

    assert result[
        "experience_analysis"
    ]["matched"] is True


# ============================================================
# TEST 2
# No relevant skills
# ============================================================

def test_no_relevant_skills():

    resume = ResumeProfile(

        candidate=CandidateInfo(
            name="Unrelated Candidate"
        ),

        skills=[
            Skill(name="Photoshop"),
            Skill(name="Figma"),
        ],

        education=[
            Education(
                degree="B.E.",
                field="Computer Science"
            )
        ],

        experience=[]
    )

    job = create_test_job()

    result = match_candidate(
        resume,
        job
    )

    assert result["overall_score"] < 30

    assert len(
        result["skill_analysis"]["missing_required"]
    ) == 4

    assert result[
        "experience_analysis"
    ]["matched"] is False


# ============================================================
# TEST 3
# Skills match but no experience
# ============================================================

def test_skills_without_experience():

    resume = ResumeProfile(

        candidate=CandidateInfo(
            name="Student Developer"
        ),

        skills=[
            Skill(name="Python"),
            Skill(name="FastAPI"),
            Skill(name="PostgreSQL"),
            Skill(name="REST APIs"),
        ],

        education=[
            Education(
                degree="B.E.",
                field="Computer Science"
            )
        ],

        experience=[]
    )

    job = create_test_job()

    result = match_candidate(
        resume,
        job
    )

    # All required skills should match
    assert len(
        result["skill_analysis"]["missing_required"]
    ) == 0

    # But professional experience should fail
    assert result[
        "experience_analysis"
    ]["matched"] is False

    # Score should NOT be near 100
    assert result["overall_score"] < 80


# ============================================================
# TEST 4
# Experience but missing skills
# ============================================================

def test_experience_without_skills():

    resume = ResumeProfile(

        candidate=CandidateInfo(
            name="Experienced Developer"
        ),

        skills=[
            Skill(name="Java"),
            Skill(name="Spring"),
        ],

        education=[
            Education(
                degree="B.E.",
                field="Computer Science"
            )
        ],

        experience=[
            Experience(
                company="Company A",
                role="Software Engineer",
                start_date="2020-01",
                end_date="2024-01"
            )
        ]
    )

    job = create_test_job()

    result = match_candidate(
        resume,
        job
    )

    # Experience should match
    assert result[
        "experience_analysis"
    ]["matched"] is True

    # Required backend skills should still be missing
    assert len(
        result["skill_analysis"]["missing_required"]
    ) == 4

    # Score shouldn't be high
    assert result["overall_score"] < 50


# ============================================================
# TEST 5
# Project-heavy student
# ============================================================

def test_projects_do_not_count_as_professional_experience():

    resume = ResumeProfile(

        candidate=CandidateInfo(
            name="Project Heavy Student"
        ),

        skills=[
            Skill(name="Python"),
            Skill(name="FastAPI"),
            Skill(name="PostgreSQL"),
            Skill(name="REST APIs"),
        ],

        education=[
            Education(
                degree="B.E.",
                field="Computer Science"
            )
        ],

        experience=[],

        projects=[
            {
                "name": "Backend Project",
                "description": "Built backend APIs.",
                "technologies": [
                    "Python",
                    "FastAPI",
                    "PostgreSQL"
                ]
            }
        ]
    )

    job = create_test_job()

    result = match_candidate(
        resume,
        job
    )

    # Skills may match
    assert len(
        result["skill_analysis"]["missing_required"]
    ) == 0

    # But projects must NOT become professional experience
    assert result[
        "experience_analysis"
    ]["candidate_years"] == 0

    assert result[
        "experience_analysis"
    ]["matched"] is False
    
    
    

def test_java_does_not_match_javascript():
    resume = ResumeProfile(
        skills=[Skill(name="JavaScript")]
    )

    job = create_test_job()
    job.skills = [
        JobSkill(name="Java", required=True)
    ]

    result = match_candidate(resume, job)

    assert result["skill_analysis"]["matched_required"] == []
    assert "Java" in result["skill_analysis"]["missing_required"]


def test_c_does_not_match_cpp():
    resume = ResumeProfile(
        skills=[Skill(name="C")]
    )

    job = create_test_job()
    job.skills = [
        JobSkill(name="C++", required=True)
    ]

    result = match_candidate(resume, job)

    assert result["skill_analysis"]["matched_required"] == []
    assert "C++" in result["skill_analysis"]["missing_required"]


def test_postgres_matches_postgresql():
    resume = ResumeProfile(
        skills=[Skill(name="Postgres")]
    )

    job = create_test_job()
    job.skills = [
        JobSkill(name="PostgreSQL", required=True)
    ]

    result = match_candidate(resume, job)

    assert len(result["skill_analysis"]["matched_required"]) == 1
    assert result["skill_analysis"]["matched_required"][0]["skill"] == "PostgreSQL"


def test_rest_api_matches_rest_apis():
    resume = ResumeProfile(
        skills=[Skill(name="REST API")]
    )

    job = create_test_job()
    job.skills = [
        JobSkill(name="REST APIs", required=True)
    ]

    result = match_candidate(resume, job)

    assert len(result["skill_analysis"]["matched_required"]) == 1


def test_aws_matches_amazon_web_services():
    resume = ResumeProfile(
        skills=[Skill(name="Amazon Web Services")]
    )

    job = create_test_job()
    job.skills = [
        JobSkill(name="AWS", required=True)
    ]

    result = match_candidate(resume, job)

    assert len(result["skill_analysis"]["matched_required"]) == 1


def test_software_developer_resume_is_capped_for_designer_role():
    resume = ResumeProfile(
        professional_summary="Software developer experienced in building web APIs.",
        skills=[Skill(name="Python"), Skill(name="FastAPI")],
        experience=[Experience(
            company="Example Co",
            role="Software Developer",
            start_date="2020-01",
            end_date="2024-01",
            technologies=["Python", "FastAPI"],
        )],
    )
    job = JobProfile(
        title="Graphic Designer",
        skills=[JobSkill(name="Figma", required=True)],
        experience=JobExperience(minimum_years=2),
    )

    result = match_candidate(resume, job)

    assert result["overall_score"] <= 25
    assert result["role_alignment"]["aligned"] is False
    assert result["score_algorithm_version"] == 4


def test_unspecified_education_is_not_reported_as_a_match():
    resume = ResumeProfile()
    job = JobProfile(title="Designer")

    result = match_candidate(resume, job)

    assert result["education_analysis"]["required"] is False
    assert result["education_analysis"]["matched"] is None
    assert result["education_analysis"]["score"] == 0
    assert "not specified" in result["education_analysis"]["reason"].lower()
    assert result["overall_score"] == 0
