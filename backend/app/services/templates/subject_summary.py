"""
EduMetrics Templates - Subject Attainment Summary

NBA Criterion 3: Subject-level Performance Analysis

This template produces subject assessment summary including
class statistics, grade distribution, and CO attainments.

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
class ClassStatistics:
    """Class-level statistics (from Phase-2B)."""
    enrolled: int
    appeared: int
    passed: int
    pass_percentage: Decimal
    average_marks: Decimal
    highest: Decimal
    lowest: Decimal


@dataclass
class GradeDistributionEntry:
    """Grade distribution entry."""
    grade: str
    count: int
    percentage: Decimal


@dataclass
class COSummaryEntry:
    """Brief CO attainment entry for summary."""
    co_code: str
    attainment_pct: Decimal
    level: int


class SubjectSummary(BaseTemplate):
    """
    Subject Attainment Summary Template
    
    NBA Criterion: 3
    Purpose: Subject-level performance overview
    
    Data Source APIs:
    - GET /analytics/result/offering/{id}
    - GET /analytics/co/offering/{id}
    """
    
    @property
    def template_name(self) -> str:
        return "subject_summary"
    
    @property
    def template_title(self) -> str:
        return "Subject Attainment Summary"
    
    @property
    def nba_criterion(self) -> str:
        return "Criterion 3"
    
    async def render(
        self,
        # From Phase-2B
        offering_id: UUID,
        subject_code: str,
        subject_name: str,
        class_stats: ClassStatistics,
        grade_distribution: List[GradeDistributionEntry],
        co_summary: List[COSummaryEntry],
        warnings: List[Dict],
        # Metadata
        institution_name: str = "",
        department_name: str = "",
        program_name: str = "",
        batch: str = "",
        semester: int = 1,
        academic_year: str = "",
    ) -> ReportOutput:
        """Render Subject Attainment Summary."""
        
        metadata = self.create_metadata(
            institution_name=institution_name,
            department_name=department_name,
            program_name=program_name,
            batch=batch,
            academic_year=academic_year,
            semester=semester,
        )
        
        sections = []
        
        # Section 1: Subject Info
        sections.append(ReportSection(
            title="Subject Details",
            content={
                "subject_code": subject_code,
                "subject_name": subject_name,
                "semester": semester,
                "batch": batch,
            }
        ))
        
        # Section 2: Class Statistics
        sections.append(self._create_stats_section(class_stats, offering_id))
        
        # Section 3: Grade Distribution
        sections.append(self._create_grade_section(grade_distribution))
        
        # Section 4: CO Attainment Summary
        sections.append(self._create_co_section(co_summary, offering_id))
        
        return ReportOutput(
            metadata=metadata,
            title=f"{self.template_title} - {subject_code}",
            sections=sections,
            warnings=warnings,
            is_complete=len(warnings) == 0,
        )
    
    def _create_stats_section(
        self,
        stats: ClassStatistics,
        offering_id: UUID,
    ) -> ReportSection:
        """Create class statistics section."""
        evidence = self.create_evidence_link(
            label="View all student results",
            endpoint=f"/analytics/result/offering/{offering_id}",
        )
        
        content = {
            "enrolled": stats.enrolled,
            "appeared": stats.appeared,
            "passed": stats.passed,
            "pass_percentage": self.format_percentage(stats.pass_percentage),
            "average_marks": f"{stats.average_marks:.2f}",
            "highest": f"{stats.highest:.2f}",
            "lowest": f"{stats.lowest:.2f}",
        }
        
        return ReportSection(
            title="Class Statistics",
            content=content,
            evidence=evidence,
        )
    
    def _create_grade_section(
        self,
        distribution: List[GradeDistributionEntry],
    ) -> ReportSection:
        """Create grade distribution section."""
        rows = []
        
        for entry in distribution:
            rows.append(TableRow(
                cells=[
                    TableCell(value=entry.grade),
                    TableCell(value=entry.count),
                    TableCell(
                        value=entry.percentage,
                        formatted=self.format_percentage(entry.percentage),
                    ),
                ]
            ))
        
        table = Table(
            headers=["Grade", "Count", "Percentage"],
            rows=rows,
            caption="Grade Distribution",
            css_class="grade-distribution-table",
        )
        
        return ReportSection(
            title="Grade Distribution",
            content=table,
        )
    
    def _create_co_section(
        self,
        co_summary: List[COSummaryEntry],
        offering_id: UUID,
    ) -> ReportSection:
        """Create CO summary section."""
        rows = []
        
        for co in co_summary:
            rows.append(TableRow(
                cells=[
                    TableCell(value=co.co_code),
                    TableCell(
                        value=co.attainment_pct,
                        formatted=self.format_percentage(co.attainment_pct),
                        css_class=self.level_to_css_class(co.level),
                    ),
                    TableCell(
                        value=co.level,
                        formatted=self.format_level(co.level),
                    ),
                ]
            ))
        
        table = Table(
            headers=["CO", "Attainment %", "Level"],
            rows=rows,
            caption="Course Outcome Attainment",
            css_class="co-summary-table",
        )
        
        evidence = self.create_evidence_link(
            label="View detailed CO report",
            endpoint=f"/analytics/co/offering/{offering_id}",
        )
        
        return ReportSection(
            title="CO Attainment",
            content=table,
            evidence=evidence,
        )
