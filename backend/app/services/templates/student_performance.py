"""
EduMetrics Templates - Student Performance Analysis

NAAC Metric 2.6.1, 2.6.2: Student Performance Tracking

This template produces individual student performance reports
including SGPA/CGPA progression and CO achievement map.

PHASE-2C CONSTRAINT: Formatting only, no computation.
"""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Dict, List, Optional
from uuid import UUID

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


@dataclass
class SemesterPerformance:
    """Semester performance entry."""
    semester: int
    sgpa: Decimal
    credits_earned: int
    subjects_passed: int
    subjects_failed: int


@dataclass
class SubjectCOAchievement:
    """Student's CO achievement in a subject."""
    subject_code: str
    subject_name: str
    cos: List[Dict]  # [{co_code, achieved_pct, met_threshold}]


class StudentPerformanceReport(BaseTemplate):
    """
    Student Performance Analysis Template
    
    NAAC Metric: 2.6.1, 2.6.2
    Purpose: Individual student performance tracking
    
    Data Source APIs:
    - GET /analytics/sgpa/student/{usn}/semester/{id}
    - GET /analytics/cgpa/student/{usn}
    - GET /analytics/co/{co_id}/students
    """
    
    @property
    def template_name(self) -> str:
        return "student_performance"
    
    @property
    def template_title(self) -> str:
        return "Student Performance Analysis"
    
    @property
    def naac_metric(self) -> str:
        return "2.6.1, 2.6.2"
    
    async def render(
        self,
        # Student info
        usn: str,
        student_name: str,
        batch: str,
        program_name: str,
        # Performance data from Phase-2B
        semester_performance: List[SemesterPerformance],
        cgpa: Decimal,
        total_credits: int,
        backlogs_pending: int,
        backlogs_cleared: int,
        co_achievement: List[SubjectCOAchievement],
        warnings: List[Dict],
        # Metadata
        institution_name: str = "",
        department_name: str = "",
        academic_year: str = "",
    ) -> ReportOutput:
        """Render Student Performance Analysis."""
        
        metadata = self.create_metadata(
            institution_name=institution_name,
            department_name=department_name,
            program_name=program_name,
            batch=batch,
            academic_year=academic_year,
        )
        
        sections = []
        
        # Section 1: Student Info
        sections.append(ReportSection(
            title="Student Information",
            content={
                "usn": usn,
                "name": student_name,
                "program": program_name,
                "batch": batch,
            }
        ))
        
        # Section 2: Overall Summary
        sections.append(self._create_summary_section(
            cgpa=cgpa,
            total_credits=total_credits,
            backlogs_pending=backlogs_pending,
            backlogs_cleared=backlogs_cleared,
            usn=usn,
        ))
        
        # Section 3: Semester-wise SGPA
        sections.append(self._create_sgpa_section(
            semester_performance=semester_performance,
            usn=usn,
        ))
        
        # Section 4: CO Achievement Map
        if co_achievement:
            sections.append(self._create_co_section(co_achievement))
        
        return ReportOutput(
            metadata=metadata,
            title=f"{self.template_title} - {usn}",
            sections=sections,
            warnings=warnings,
            is_complete=len(warnings) == 0,
        )
    
    def _create_summary_section(
        self,
        cgpa: Decimal,
        total_credits: int,
        backlogs_pending: int,
        backlogs_cleared: int,
        usn: str,
    ) -> ReportSection:
        """Create overall summary section."""
        evidence = self.create_evidence_link(
            label="View CGPA details",
            endpoint=f"/analytics/cgpa/student/{usn}",
        )
        
        status = "Regular"
        if backlogs_pending > 0:
            status = f"Backlog ({backlogs_pending} pending)"
        elif backlogs_cleared > 0:
            status = f"Regular (cleared {backlogs_cleared} backlogs)"
        
        content = {
            "cgpa": f"{cgpa:.2f}",
            "total_credits": total_credits,
            "backlogs_pending": backlogs_pending,
            "backlogs_cleared": backlogs_cleared,
            "status": status,
        }
        
        return ReportSection(
            title="Academic Summary",
            content=content,
            evidence=evidence,
        )
    
    def _create_sgpa_section(
        self,
        semester_performance: List[SemesterPerformance],
        usn: str,
    ) -> ReportSection:
        """Create semester-wise SGPA section."""
        rows = []
        
        for sem in semester_performance:
            status = "Clear"
            if sem.subjects_failed > 0:
                status = f"{sem.subjects_failed} backlog(s)"
            
            rows.append(TableRow(
                cells=[
                    TableCell(value=f"Semester {sem.semester}"),
                    TableCell(
                        value=sem.sgpa,
                        formatted=f"{sem.sgpa:.2f}",
                    ),
                    TableCell(value=sem.credits_earned),
                    TableCell(value=sem.subjects_passed),
                    TableCell(
                        value=sem.subjects_failed,
                        css_class="backlog" if sem.subjects_failed > 0 else "",
                    ),
                    TableCell(value=status),
                ]
            ))
        
        table = Table(
            headers=["Semester", "SGPA", "Credits", "Passed", "Failed", "Status"],
            rows=rows,
            caption="Semester-wise Performance",
            css_class="sgpa-table",
        )
        
        return ReportSection(
            title="Semester-wise SGPA",
            content=table,
        )
    
    def _create_co_section(
        self,
        co_achievement: List[SubjectCOAchievement],
    ) -> ReportSection:
        """Create CO achievement map section."""
        subsections = []
        
        for subj in co_achievement:
            rows = []
            for co in subj.cos:
                met = co.get("met_threshold", False)
                rows.append(TableRow(
                    cells=[
                        TableCell(value=co.get("co_code", "")),
                        TableCell(
                            value=co.get("achieved_pct", Decimal("0")),
                            formatted=self.format_percentage(co.get("achieved_pct", Decimal("0"))),
                        ),
                        TableCell(
                            value=met,
                            formatted="✓" if met else "✗",
                            css_class="met" if met else "not-met",
                        ),
                    ]
                ))
            
            table = Table(
                headers=["CO", "Achievement %", "Threshold Met"],
                rows=rows,
                caption=f"{subj.subject_code} - {subj.subject_name}",
            )
            
            subsections.append(ReportSection(
                title=subj.subject_code,
                content=table,
            ))
        
        return ReportSection(
            title="CO Achievement Map",
            content={"note": "Per-subject CO achievement details"},
            subsections=subsections,
        )
