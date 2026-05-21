import uuid
from dataclasses import dataclass, field
from datetime import datetime

from sqlalchemy import Column, String, Float, Integer, JSON, DateTime, Text
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


@dataclass
class Course:
    course_name: str
    organization: str
    description: str
    skills: list[str]
    difficulty_level: str
    rating: float
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    course_url: str = ""
    prerequisites: list[str] = field(default_factory=list)
    certificate_type: str = ""
    students_enrolled: int = 0
    embedding: list[float] | None = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "course_name": self.course_name,
            "organization": self.organization,
            "description": self.description,
            "skills": self.skills,
            "difficulty_level": self.difficulty_level,
            "rating": self.rating,
            "course_url": self.course_url,
            "prerequisites": self.prerequisites,
            "certificate_type": self.certificate_type,
            "students_enrolled": self.students_enrolled,
        }

    def get_text_for_embedding(self) -> str:
        skills_str = " ".join(self.skills)
        return f"{self.course_name} {self.organization} {self.description} {skills_str} {self.difficulty_level}"


class CourseDB(Base):
    __tablename__ = "courses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    course_name = Column(String, nullable=False, index=True)
    organization = Column(String, nullable=False)
    description = Column(Text)
    skills = Column(JSON, default=list)
    difficulty_level = Column(String)
    rating = Column(Float, default=0.0)
    course_url = Column(String, default="")
    prerequisites = Column(JSON, default=list)
    certificate_type = Column(String, default="")
    students_enrolled = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
