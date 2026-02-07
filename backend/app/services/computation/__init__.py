"""
EduMetrics Computation Layer - Module Initialization

This module contains pure functions for all academic computations.
No side effects, no database writes, no caching.

All functions follow LOCKED RULES from Phase-2A Computation Design.
Each function references its LOCKED RULE ID in the docstring.

Module Structure:
- warnings.py: ComputationWarning, ComputationResult dataclasses
- detention_absence.py: Student status identification (DETAINED-001 to DETAINED-004)
- internal_marks.py: Internal exam scaling and best-of logic (SCALE-001 to SCALE-004)
- external_marks.py: External marks with section Best-N logic
- totals.py: Total marks computation
- grading.py: Grade and grade point assignment
- backlog_rules.py: Multi-attempt handling (BACKLOG-001 to BACKLOG-004)
- sgpa.py: SGPA calculation
- cgpa.py: CGPA calculation
- co_attainment.py: CO attainment computation (CO-DENOM-001, CO-MAX-001 to CO-MAX-004)
- po_attainment.py: PO attainment derived from CO (LEVEL-001 to LEVEL-003)
- pso_attainment.py: PSO attainment derived from CO (PSO-001, PSO-002)
"""

from app.services.computation.warnings import (
    ComputationWarning,
    ComputationResult,
    WarningCode,
)
from app.services.computation.detention_absence import (
    is_detained,
    is_absent_for_exam,
    get_valid_students_for_attainment,
)
from app.services.computation.internal_marks import (
    scale_internal_exam,
    compute_best_internal,
    compute_internal_total,
    InternalExamResult,
    InternalTotalResult,
)
from app.services.computation.external_marks import (
    get_section_marks_with_selection,
    compute_external_marks,
    ExternalMarksResult,
)
from app.services.computation.totals import (
    compute_total_marks,
    TotalMarksResult,
)
from app.services.computation.grading import (
    compute_grade,
    meets_pass_criteria,
    GradeResult,
)
from app.services.computation.backlog_rules import (
    get_result_marks,
    ResultMarks,
)
from app.services.computation.sgpa import (
    compute_sgpa,
    SGPAResult,
    SubjectResult,
)
from app.services.computation.cgpa import (
    compute_cgpa,
    CGPAResult,
    SemesterSGPA,
)
from app.services.computation.co_attainment import (
    compute_co_attainment,
    compute_co_attainment_final,
    compute_co_max_marks,
    COAttainmentResult,
    COAttainmentFinal,
)
from app.services.computation.po_attainment import (
    compute_po_attainment,
    classify_attainment,
    classify_attainment_static,
    POAttainmentResult,
    AttainmentThresholds,
)
from app.services.computation.pso_attainment import (
    compute_pso_attainment,
    compute_all_pso_attainments,
    PSOAttainmentResult,
)
from app.services.computation.grading import (
    PassCriteria,
    GradingRule,
)
from app.services.computation.backlog_rules import (
    AttemptData,
)

__all__ = [
    # Warnings
    "ComputationWarning",
    "ComputationResult",
    "WarningCode",
    # Detention/Absence
    "is_detained",
    "is_absent_for_exam",
    "get_valid_students_for_attainment",
    # Internal Marks
    "scale_internal_exam",
    "compute_best_internal",
    "compute_internal_total",
    "InternalExamResult",
    "InternalTotalResult",
    # External Marks
    "get_section_marks_with_selection",
    "compute_external_marks",
    "ExternalMarksResult",
    # Totals
    "compute_total_marks",
    "TotalMarksResult",
    # Grading
    "compute_grade",
    "meets_pass_criteria",
    "GradeResult",
    # Backlog
    "get_result_marks",
    "ResultMarks",
    # SGPA/CGPA
    "compute_sgpa",
    "compute_cgpa",
    "SGPAResult",
    "CGPAResult",
    # CO Attainment
    "compute_co_attainment",
    "compute_co_attainment_final",
    "compute_co_max_marks",
    "COAttainmentResult",
    "COAttainmentFinal",
    # PO Attainment
    "compute_po_attainment",
    "classify_attainment",
    "classify_attainment_static",
    "POAttainmentResult",
    "AttainmentThresholds",
    # PSO Attainment
    "compute_pso_attainment",
    "compute_all_pso_attainments",
    "PSOAttainmentResult",
    # Additional types for analytics
    "SubjectResult",
    "SemesterSGPA",
    "PassCriteria",
    "GradingRule",
    "AttemptData",
]
