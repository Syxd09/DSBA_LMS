"""
EduMetrics Templates Layer

PHASE-2C: NBA/NAAC Report Templates

This module provides formatting-only templates that consume
Phase-2B Analytics APIs. No computation logic exists here.

All templates follow these constraints:
1. Read-only consumption of Phase-2B APIs
2. No math, thresholds, or averages
3. Full traceability to source data
4. Evidence links for audit drill-down
"""

from app.services.templates.base import (
    BaseTemplate,
    ReportOutput,
    ReportMetadata,
    ReportSection,
    Table,
    TableRow,
    TableCell,
    EvidenceLink,
)
from app.services.templates.co_attainment import COAttainmentReport
from app.services.templates.po_matrix import POAttainmentMatrix
from app.services.templates.subject_summary import SubjectSummary
from app.services.templates.student_performance import StudentPerformanceReport
from app.services.templates.gap_analysis import GapAnalysisReport

__all__ = [
    # Base classes
    "BaseTemplate",
    "ReportOutput",
    "ReportMetadata",
    "ReportSection",
    "Table",
    "TableRow",
    "TableCell",
    "EvidenceLink",
    # Templates
    "COAttainmentReport",
    "POAttainmentMatrix",
    "SubjectSummary",
    "StudentPerformanceReport",
    "GapAnalysisReport",
]
