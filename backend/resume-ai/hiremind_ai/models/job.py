
from typing import List, Optional
from pydantic import BaseModel, Field


class JobSkill(BaseModel):
    name: str
    category: Optional[str] = None
    required: bool = True
    evidence: Optional[str] = None


class JobCertification(BaseModel):
    name: str
    required: bool = False
    evidence: Optional[str] = None


class JobExperience(BaseModel):
    minimum_years: Optional[float] = None
    preferred_years: Optional[float] = None
    description: Optional[str] = None


class JobEducation(BaseModel):
    degree: Optional[str] = None
    field: Optional[str] = None
    required: bool = False


class JobProfile(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    summary: Optional[str] = None

    skills: List[JobSkill] = Field(default_factory=list)
    experience: Optional[JobExperience] = None
    education: List[JobEducation] = Field(default_factory=list)
    responsibilities: List[str] = Field(default_factory=list)
    certifications: List[JobCertification] = Field(default_factory=list)
