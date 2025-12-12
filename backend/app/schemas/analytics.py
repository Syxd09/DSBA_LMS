"""
EduMetrics Backend - Analytics Schemas
Pydantic models for analytics endpoints
"""
from typing import Optional, List
from pydantic import BaseModel
from uuid import UUID


class COAttainmentData(BaseModel):
    """CO attainment data point."""
    co: str
    co_number: int
    description: str
    attainment: float
    target: float = 70.0
    achieved: bool = False


class BloomDistribution(BaseModel):
    """Bloom's taxonomy distribution."""
    level: str
    count: int
    percentage: float


class BloomPerformance(BaseModel):
    """Student bloom level performance."""
    level: str
    percentage: float
    questions_attempted: int
    total_questions: int


class SubjectPerformance(BaseModel):
    """Subject-wise performance data."""
    subject_id: str
    subject_name: str
    subject_code: str
    average: float
    highest: float
    lowest: float
    pass_rate: float
    total_students: int


class DepartmentStats(BaseModel):
    """Department statistics."""
    id: str
    name: str
    code: str
    students: int
    teachers: int
    programs: int


class AtRiskStudent(BaseModel):
    """At-risk student data."""
    student_id: str
    student_name: str
    roll_number: str
    average_percentage: float
    subjects_at_risk: int
    total_subjects: int


# Dashboard data schemas
class PrincipalDashboardData(BaseModel):
    """Principal dashboard aggregated data."""
    total_students: int
    total_teachers: int
    total_subjects: int
    total_departments: int
    at_risk_students: int
    avg_pass_rate: float
    co_attainment: List[COAttainmentData]
    department_stats: List[DepartmentStats]


class HODDashboardData(BaseModel):
    """HOD dashboard aggregated data."""
    department_students: int
    department_teachers: int
    pass_rate: float
    at_risk_students: int
    subject_performance: List[SubjectPerformance]
    co_attainment: List[COAttainmentData]


class TeacherDashboardData(BaseModel):
    """Teacher dashboard aggregated data."""
    assigned_subjects: int
    total_students: int
    pending_evaluations: int
    class_average: float
    subjects: List[dict]  # Subject details with exam status


class StudentDashboardData(BaseModel):
    """Student dashboard aggregated data."""
    overall_average: float
    sgpa: float
    cgpa: float
    subjects_enrolled: int
    results: List[dict]
    bloom_performance: List[BloomPerformance]
