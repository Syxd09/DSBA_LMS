"""EduMetrics Backend - Pydantic Schemas"""
from app.schemas.common import ResponseBase, PaginatedResponse, ErrorResponse
from app.schemas.user import (
    UserCreate, UserUpdate, UserResponse, UserRoleUpdate,
    ProfileResponse, Token, TokenData, LoginRequest, SignupRequest
)
from app.schemas.organization import (
    DepartmentCreate, DepartmentUpdate, DepartmentResponse,
    ProgramCreate, ProgramUpdate, ProgramResponse,
    CohortCreate, CohortUpdate, CohortResponse,
    SectionCreate, SectionUpdate, SectionResponse
)
from app.schemas.academic import (
    SubjectCreate, SubjectUpdate, SubjectResponse, SubjectWithOutcomes,
    CurriculumVersionCreate, CurriculumVersionResponse,
    StudentEnrollmentCreate, StudentEnrollmentResponse,
    TeacherAssignmentCreate, TeacherAssignmentResponse,
    SubjectOfferingCreate, SubjectOfferingResponse
)
from app.schemas.outcomes import (
    CourseOutcomeCreate, CourseOutcomeUpdate, CourseOutcomeResponse,
    ProgramOutcomeCreate, ProgramOutcomeUpdate, ProgramOutcomeResponse,
    COPOMappingCreate, COPOMappingBulkCreate, COPOMappingResponse,
    ProgramSpecificOutcomeCreate, ProgramSpecificOutcomeUpdate, ProgramSpecificOutcomeResponse,
    COPSOMappingCreate, COPSOMappingBulkCreate, COPSOMappingResponse
)
from app.schemas.exam import (
    ExamCreate, ExamUpdate, ExamResponse, ExamWithStructure,
    ExamSectionCreate, ExamSectionResponse,
    QuestionCreate, QuestionResponse,
    SubQuestionCreate, SubQuestionResponse,
    ExamStructureCreate
)
from app.schemas.marks import (
    StudentMarkEntry, BulkMarksCreate, StudentMarksResponse,
    MarksComputedResponse, FinalMarksCreate, FinalMarksResponse,
    SemesterResultResponse
)
from app.schemas.grading import (
    GradingRuleCreate, GradingRuleResponse,
    CalculateGradesRequest, CalculateSGPARequest
)
from app.schemas.analytics import (
    COAttainmentData, BloomDistribution, BloomPerformance,
    SubjectPerformance, DepartmentStats, AtRiskStudent,
    PrincipalDashboardData, HODDashboardData,
    TeacherDashboardData, StudentDashboardData,
    COAttainmentResponse, POContribution, PerformanceTrend
)

from app.schemas.student import StudentCreate, StudentUpdate, StudentResponse
from app.schemas.unit_topic import (
    UnitCreate, UnitUpdate, UnitResponse, UnitWithTopicsResponse,
    TopicCreate, TopicUpdate, TopicResponse,
    UnitReorderRequest, BulkTopicCreate
)

__all__ = [
    # Common
    "ResponseBase", "PaginatedResponse", "ErrorResponse",
    # User
    "UserCreate", "UserUpdate", "UserResponse", "UserRoleUpdate",
    "ProfileResponse", "Token", "TokenData", "LoginRequest", "SignupRequest",
    # Organization
    "DepartmentCreate", "DepartmentUpdate", "DepartmentResponse",
    "ProgramCreate", "ProgramUpdate", "ProgramResponse",
    "CohortCreate", "CohortUpdate", "CohortResponse",
    "SectionCreate", "SectionUpdate", "SectionResponse",
    # Academic
    "SubjectCreate", "SubjectUpdate", "SubjectResponse", "SubjectWithOutcomes",
    "CurriculumVersionCreate", "CurriculumVersionResponse",
    "StudentEnrollmentCreate", "StudentEnrollmentResponse",
    "TeacherAssignmentCreate", "TeacherAssignmentResponse",
    "SubjectOfferingCreate", "SubjectOfferingResponse",
    # Outcomes
    "CourseOutcomeCreate", "CourseOutcomeUpdate", "CourseOutcomeResponse",
    "ProgramOutcomeCreate", "ProgramOutcomeResponse",
    "COPOMappingCreate", "COPOMappingBulkCreate", "COPOMappingResponse",
    # Exam
    "ExamCreate", "ExamUpdate", "ExamResponse", "ExamWithStructure",
    "ExamSectionCreate", "ExamSectionResponse",
    "QuestionCreate", "QuestionResponse",
    "SubQuestionCreate", "SubQuestionResponse",
    "ExamStructureCreate",
    # Marks
    "StudentMarkEntry", "BulkMarksCreate", "StudentMarksResponse",
    "MarksComputedResponse", "FinalMarksCreate", "FinalMarksResponse",
    "SemesterResultResponse",
    # Grading
    "GradingRuleCreate", "GradingRuleResponse",
    "CalculateGradesRequest", "CalculateSGPARequest",
    # Analytics
    "COAttainmentData", "BloomDistribution", "BloomPerformance",
    "SubjectPerformance", "DepartmentStats", "AtRiskStudent",
    "PrincipalDashboardData", "HODDashboardData",
    "TeacherDashboardData", "StudentDashboardData",
    "COAttainmentResponse", "POContribution", "PerformanceTrend",
    # Student
    "StudentCreate", "StudentUpdate", "StudentResponse",
    # Unit & Topic
    "UnitCreate", "UnitUpdate", "UnitResponse", "UnitWithTopicsResponse",
    "TopicCreate", "TopicUpdate", "TopicResponse",
    "UnitReorderRequest", "BulkTopicCreate",
]

