"""
EduMetrics Backend - Semester Model
B-01: Explicit Semester entity with ODD/EVEN type enforcement

Academic Rules:
- Semesters are numbered 1-8 for 4-year programs
- ODD semesters: 1, 3, 5, 7
- EVEN semesters: 2, 4, 6, 8
- Each cohort progresses through semesters sequentially
- Semester transition requires HOD approval
"""
import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class SemesterType(str, Enum):
    """Semester type - ODD or EVEN."""
    ODD = "ODD"
    EVEN = "EVEN"


class SemesterStatus(str, Enum):
    """Status of a semester for a cohort."""
    UPCOMING = "upcoming"
    ACTIVE = "active"
    COMPLETED = "completed"


class Semester(Base):
    """
    Explicit Semester model for academic progression.
    
    Each cohort's semester is tracked explicitly with:
    - Semester number (1-8)
    - Type (ODD/EVEN) - auto-derived from number
    - Status (upcoming/active/completed)
    - Start/end dates when activated
    
    Academic Integrity:
    - Semester progression is strictly sequential
    - Cannot skip semesters
    - ODD/EVEN pattern must be maintained
    """
    __tablename__ = "semesters"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cohort_id = Column(UUID(as_uuid=True), ForeignKey("cohorts.id"), nullable=False, index=True)
    semester_no = Column(Integer, nullable=False)  # 1-8
    semester_type = Column(String, nullable=False)  # ODD or EVEN
    status = Column(String, default=SemesterStatus.UPCOMING.value, nullable=False)
    
    # Activation dates
    start_date = Column(DateTime, nullable=True)  # When semester started
    end_date = Column(DateTime, nullable=True)  # When semester ended
    
    # Academic session details
    academic_year = Column(String, nullable=True)  # e.g., "2024-25"
    
    # Approval tracking
    activated_by = Column(UUID(as_uuid=True), nullable=True)  # HOD who approved
    activated_at = Column(DateTime, nullable=True)
    completed_by = Column(UUID(as_uuid=True), nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    cohort = relationship("Cohort", back_populates="semesters")
    
    def __repr__(self):
        return f"<Semester {self.semester_no} ({self.semester_type}) - {self.status}>"
    
    @staticmethod
    def get_semester_type(semester_no: int) -> str:
        """Derive semester type from number."""
        return SemesterType.ODD.value if semester_no % 2 == 1 else SemesterType.EVEN.value
    
    @staticmethod
    def validate_semester_no(semester_no: int, program_duration_years: int = 4) -> bool:
        """Validate semester number is within program duration."""
        max_semester = program_duration_years * 2
        return 1 <= semester_no <= max_semester
    
    @staticmethod
    def get_next_semester_no(current_semester_no: int) -> int:
        """Get the next semester number."""
        return current_semester_no + 1


# =============================================================================
# SEMESTER SERVICE
# =============================================================================

class SemesterService:
    """Service for semester-related operations."""
    
    @staticmethod
    def create_semesters_for_cohort(db, cohort_id: uuid.UUID, program_duration_years: int = 4):
        """
        Create all semester records for a new cohort.
        
        Creates semesters 1-8 (for 4-year program) with UPCOMING status.
        First semester is set to ACTIVE.
        """
        semesters = []
        max_semester = program_duration_years * 2
        
        for sem_no in range(1, max_semester + 1):
            semester = Semester(
                cohort_id=cohort_id,
                semester_no=sem_no,
                semester_type=Semester.get_semester_type(sem_no),
                status=SemesterStatus.ACTIVE.value if sem_no == 1 else SemesterStatus.UPCOMING.value,
                activated_at=datetime.utcnow() if sem_no == 1 else None,
                start_date=datetime.utcnow() if sem_no == 1 else None
            )
            semesters.append(semester)
            db.add(semester)
        
        db.commit()
        return semesters
    
    @staticmethod
    def promote_to_next_semester(
        db, 
        cohort_id: uuid.UUID, 
        approved_by: uuid.UUID,
        reason: str = ""
    ) -> dict:
        """
        Promote cohort to the next semester.
        
        Steps:
        1. Find current ACTIVE semester
        2. Mark it as COMPLETED
        3. Activate the next UPCOMING semester
        4. Log the transition
        
        Returns:
            Dict with previous and new semester info
        """
        # Find current active semester
        current = db.query(Semester).filter(
            Semester.cohort_id == cohort_id,
            Semester.status == SemesterStatus.ACTIVE.value
        ).first()
        
        if not current:
            raise ValueError("No active semester found for cohort")
        
        # Find next semester
        next_sem = db.query(Semester).filter(
            Semester.cohort_id == cohort_id,
            Semester.semester_no == current.semester_no + 1
        ).first()
        
        if not next_sem:
            raise ValueError("No next semester available - cohort has completed program")
        
        # Complete current semester
        current.status = SemesterStatus.COMPLETED.value
        current.end_date = datetime.utcnow()
        current.completed_by = approved_by
        current.completed_at = datetime.utcnow()
        
        # Activate next semester
        next_sem.status = SemesterStatus.ACTIVE.value
        next_sem.start_date = datetime.utcnow()
        next_sem.activated_by = approved_by
        next_sem.activated_at = datetime.utcnow()
        
        db.commit()
        
        return {
            "previous_semester": current.semester_no,
            "new_semester": next_sem.semester_no,
            "new_semester_type": next_sem.semester_type,
            "promoted_at": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def get_active_semester(db, cohort_id: uuid.UUID) -> Semester:
        """Get the current active semester for a cohort."""
        return db.query(Semester).filter(
            Semester.cohort_id == cohort_id,
            Semester.status == SemesterStatus.ACTIVE.value
        ).first()
    
    @staticmethod
    def get_semester_history(db, cohort_id: uuid.UUID) -> list:
        """Get all semesters for a cohort with status."""
        return db.query(Semester).filter(
            Semester.cohort_id == cohort_id
        ).order_by(Semester.semester_no).all()
