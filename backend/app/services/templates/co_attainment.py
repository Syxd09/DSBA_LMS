"""
EduMetrics Templates - CO Attainment Report

NBA Criterion 3 & 4: Course Outcomes Attainment

This template produces the official CO attainment report
that maps to Phase-2B CO APIs.

PHASE-2C CONSTRAINT: Formatting only, no computation.
All data sourced from Phase-2B API responses.
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
class CODefinition:
    """CO definition data (from Phase-2B)."""
    co_id: UUID
    co_code: str
    co_statement: str
    bloom_level: str = ""
    mapped_units: List[str] = field(default_factory=list)


@dataclass
class COAttainmentData:
    """CO attainment data (from Phase-2B)."""
    co_id: UUID
    co_code: str
    internal_percentage: Decimal
    internal_level: int
    external_percentage: Decimal
    external_level: int
    final_percentage: Decimal
    final_level: int
    threshold: Decimal
    target_met: bool


class COAttainmentReport(BaseTemplate):
    """
    CO Attainment Report Template
    
    NBA Criterion: 3 & 4
    Purpose: Document Course Outcomes attainment for a subject
    
    Data Source APIs:
    - GET /analytics/co/offering/{id}
    - GET /analytics/co/{co_id}/students
    """
    
    @property
    def template_name(self) -> str:
        return "co_attainment_report"
    
    @property
    def template_title(self) -> str:
        return "Course Outcomes Attainment Report"
    
    @property
    def nba_criterion(self) -> str:
        return "Criterion 3 & 4"
    
    async def render(
        self,
        # From Phase-2B API response
        offering_id: UUID,
        subject_code: str,
        subject_name: str,
        co_definitions: List[CODefinition],
        co_attainments: List[COAttainmentData],
        summary: Dict,
        warnings: List[Dict],
        # Metadata
        institution_name: str = "",
        department_name: str = "",
        program_name: str = "",
        batch: str = "",
        semester: int = 1,
        academic_year: str = "",
    ) -> ReportOutput:
        """
        Render CO Attainment Report.
        
        All data is pre-fetched from Phase-2B APIs.
        This method only formats the data for presentation.
        """
        
        # Create metadata
        metadata = self.create_metadata(
            institution_name=institution_name,
            department_name=department_name,
            program_name=program_name,
            batch=batch,
            academic_year=academic_year,
            semester=semester,
        )
        
        sections = []
        
        # Section 1: Subject Information
        sections.append(self._create_subject_section(
            subject_code=subject_code,
            subject_name=subject_name,
            offering_id=offering_id,
        ))
        
        # Section 2: CO Definitions Table
        sections.append(self._create_co_definitions_section(co_definitions))
        
        # Section 3: CO Attainment Summary Table
        sections.append(self._create_attainment_section(
            co_attainments=co_attainments,
            offering_id=offering_id,
        ))
        
        # Section 4: Summary Statistics
        sections.append(self._create_summary_section(summary))
        
        # Section 5: Evidence Links
        sections.append(self._create_evidence_section(
            offering_id=offering_id,
            co_attainments=co_attainments,
        ))
        
        return ReportOutput(
            metadata=metadata,
            title=f"{self.template_title} - {subject_code}",
            sections=sections,
            warnings=warnings,
            is_complete=len(warnings) == 0,
        )
    
    def _create_subject_section(
        self,
        subject_code: str,
        subject_name: str,
        offering_id: UUID,
    ) -> ReportSection:
        """Create subject information section."""
        content = {
            "subject_code": subject_code,
            "subject_name": subject_name,
            "offering_id": str(offering_id),
        }
        return ReportSection(
            title="Subject Information",
            content=content,
        )
    
    def _create_co_definitions_section(
        self,
        co_definitions: List[CODefinition],
    ) -> ReportSection:
        """Create CO definitions table section."""
        rows = []
        
        for co in co_definitions:
            rows.append(TableRow(
                cells=[
                    TableCell(value=co.co_code),
                    TableCell(value=co.co_statement),
                    TableCell(value=co.bloom_level or "-"),
                    TableCell(value=", ".join(co.mapped_units) if co.mapped_units else "-"),
                ]
            ))
        
        table = Table(
            headers=["CO Code", "CO Statement", "Bloom's Level", "Mapped Units"],
            rows=rows,
            caption="Course Outcomes Definition",
            css_class="co-definitions-table",
        )
        
        return ReportSection(
            title="Course Outcomes (COs)",
            content=table,
        )
    
    def _create_attainment_section(
        self,
        co_attainments: List[COAttainmentData],
        offering_id: UUID,
    ) -> ReportSection:
        """Create CO attainment summary table section."""
        rows = []
        
        for co in co_attainments:
            # Create drill-down evidence link
            evidence = self.create_evidence_link(
                label=f"View {co.co_code} student evidence",
                endpoint=f"/analytics/co/{co.co_id}/students",
                offering_id=str(offering_id),
            )
            
            rows.append(TableRow(
                cells=[
                    TableCell(value=co.co_code),
                    TableCell(
                        value=co.internal_percentage,
                        formatted=self.format_percentage(co.internal_percentage),
                        css_class=self.level_to_css_class(co.internal_level),
                    ),
                    TableCell(
                        value=co.internal_level,
                        formatted=self.format_level(co.internal_level),
                    ),
                    TableCell(
                        value=co.external_percentage,
                        formatted=self.format_percentage(co.external_percentage),
                        css_class=self.level_to_css_class(co.external_level),
                    ),
                    TableCell(
                        value=co.external_level,
                        formatted=self.format_level(co.external_level),
                    ),
                    TableCell(
                        value=co.final_percentage,
                        formatted=self.format_percentage(co.final_percentage),
                        css_class=self.level_to_css_class(co.final_level),
                        evidence=evidence,
                    ),
                    TableCell(
                        value=co.final_level,
                        formatted=self.format_level(co.final_level),
                    ),
                    TableCell(
                        value=co.target_met,
                        formatted="✓" if co.target_met else "✗",
                        css_class="target-met" if co.target_met else "target-not-met",
                    ),
                ]
            ))
        
        table = Table(
            headers=[
                "CO Code",
                "Internal %", "Level",
                "External %", "Level",
                "Final %", "Level",
                "Target Met"
            ],
            rows=rows,
            caption="CO Attainment Summary (40% Internal + 60% External)",
            css_class="co-attainment-table",
        )
        
        return ReportSection(
            title="CO Attainment Summary",
            content=table,
            notes=[
                "Level 3: ≥70%, Level 2: ≥55%, Level 1: ≥40%, Level 0: <40%",
                "Final Attainment = 0.4 × Internal + 0.6 × External",
            ],
        )
    
    def _create_summary_section(
        self,
        summary: Dict,
    ) -> ReportSection:
        """Create summary statistics section."""
        content = {
            "total_cos": summary.get("total_cos", 0),
            "cos_attained": summary.get("cos_attained", 0),
            "cos_not_attained": summary.get("total_cos", 0) - summary.get("cos_attained", 0),
            "attainment_rate": f"{(summary.get('cos_attained', 0) / max(summary.get('total_cos', 1), 1) * 100):.1f}%",
            "average_attainment": self.format_percentage(
                summary.get("average_attainment", Decimal("0"))
            ),
        }
        
        return ReportSection(
            title="Summary Statistics",
            content=content,
        )
    
    def _create_evidence_section(
        self,
        offering_id: UUID,
        co_attainments: List[COAttainmentData],
    ) -> ReportSection:
        """Create evidence links section for NBA audit."""
        evidence_links = []
        
        # Main offering CO report
        evidence_links.append({
            "label": "Full CO Attainment Data (JSON)",
            "url": f"/api/v1/analytics/co/offering/{offering_id}",
            "type": "api",
        })
        
        # Per-CO student evidence
        for co in co_attainments:
            evidence_links.append({
                "label": f"{co.co_code} - Student-level Evidence",
                "url": f"/api/v1/analytics/co/{co.co_id}/students?offering_id={offering_id}",
                "type": "drill-down",
            })
        
        return ReportSection(
            title="Audit Evidence Links",
            content={"evidence_links": evidence_links},
            notes=[
                "All evidence URLs are live endpoints that return current data.",
                "Data is computed on-demand from source student marks.",
            ],
        )
