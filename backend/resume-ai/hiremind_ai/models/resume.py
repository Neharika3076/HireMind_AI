from typing import List, Optional
from pydantic import BaseModel, Field


class CandidateInfo(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None


class Skill(BaseModel):
    name: str
    category: Optional[str] = None
    evidence: Optional[str] = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class Education(BaseModel):
    degree: Optional[str] = None
    field: Optional[str] = None
    institution: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None


class Experience(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None
    technologies: List[str] = Field(default_factory=list)


class Project(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    technologies: List[str] = Field(default_factory=list)


class ResumeProfile(BaseModel):
    candidate: CandidateInfo = Field(default_factory=CandidateInfo)

    professional_summary: Optional[str] = None

    skills: List[Skill] = Field(default_factory=list)

    education: List[Education] = Field(default_factory=list)

    experience: List[Experience] = Field(default_factory=list)

    projects: List[Project] = Field(default_factory=list)

    certifications: List[str] = Field(default_factory=list)

    languages: List[str] = Field(default_factory=list)