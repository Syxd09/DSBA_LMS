"""
EduMetrics Computation Layer - Warning System

Provides standardized warning structures for all computation functions.
Every computation function returns value + warnings + is_complete.
"""
from dataclasses import dataclass, field
from decimal import Decimal
from enum import Enum
from typing import List, Any, Optional


class WarningCode(str, Enum):
    """
    Standardized warning codes for computation results.
    """
    # Internal exam warnings
    NO_INTERNAL_APPEARANCE = "NO_INTERNAL_APPEARANCE"
    INT1_NOT_CONDUCTED = "INT1_NOT_CONDUCTED"
    INT2_NOT_CONDUCTED = "INT2_NOT_CONDUCTED"
    PARTIAL_EVALUATION = "PARTIAL_EVALUATION"
    
    # External exam warnings
    NO_EXTERNAL_MARKS = "NO_EXTERNAL_MARKS"
    EXTERNAL_NOT_CONDUCTED = "EXTERNAL_NOT_CONDUCTED"
    
    # Component warnings
    MISSING_ASSIGNMENT_1 = "MISSING_ASSIGNMENT_1"
    MISSING_ASSIGNMENT_2 = "MISSING_ASSIGNMENT_2"
    MISSING_ATTENDANCE = "MISSING_ATTENDANCE"
    MISSING_ACTIVITY = "MISSING_ACTIVITY"
    
    # Student status warnings
    STUDENT_DETAINED = "STUDENT_DETAINED"
    STUDENT_ABSENT = "STUDENT_ABSENT"
    
    # CO/PO warnings
    NO_QUESTIONS_MAPPED = "NO_QUESTIONS_MAPPED"
    NO_CO_PO_MAPPING = "NO_CO_PO_MAPPING"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"
    NO_COS_DEFINED = "NO_COS_DEFINED"
    NO_POS_DEFINED = "NO_POS_DEFINED"
    
    # Backlog warnings
    MULTIPLE_ATTEMPTS = "MULTIPLE_ATTEMPTS"
    INTERNAL_FROZEN = "INTERNAL_FROZEN"
    
    # Extended external analytics warnings
    NO_STUDENTS_APPEARED = "NO_STUDENTS_APPEARED"
    EXTERNAL_NO_QUESTION_DATA = "EXTERNAL_NO_QUESTION_DATA"
    
    # NAAC/NBA report warnings
    NAAC_DATA_INCOMPLETE = "NAAC_DATA_INCOMPLETE"
    NAAC_THRESHOLD_NOT_MET = "NAAC_THRESHOLD_NOT_MET"
    
    # General
    DIVISION_BY_ZERO = "DIVISION_BY_ZERO"
    CONFIG_NOT_FOUND = "CONFIG_NOT_FOUND"


@dataclass
class ComputationWarning:
    """
    Represents a warning generated during computation.
    
    Attributes:
        code: Standardized warning code from WarningCode enum
        message: Human-readable description of the warning
        affected_entities: List of entity IDs affected (USNs, question IDs, etc.)
        context: Optional additional context data
    """
    code: WarningCode
    message: str
    affected_entities: List[str] = field(default_factory=list)
    context: Optional[dict] = None
    
    def __repr__(self) -> str:
        return f"Warning({self.code.value}: {self.message})"


@dataclass
class ComputationResult:
    """
    Standard result wrapper for all computation functions.
    
    Every computation function MUST return this structure.
    
    Attributes:
        value: The computed value (Decimal, int, or complex object)
        warnings: List of warnings generated during computation
        is_complete: False if any critical data was missing
    """
    value: Any
    warnings: List[ComputationWarning] = field(default_factory=list)
    is_complete: bool = True
    
    def add_warning(self, code: WarningCode, message: str, 
                    entities: List[str] = None, context: dict = None) -> None:
        """Add a warning to this result."""
        self.warnings.append(ComputationWarning(
            code=code,
            message=message,
            affected_entities=entities or [],
            context=context
        ))
    
    def has_warnings(self) -> bool:
        """Check if result has any warnings."""
        return len(self.warnings) > 0
    
    @property
    def warning_codes(self) -> List[str]:
        """Get list of warning codes as strings."""
        return [w.code.value for w in self.warnings]
