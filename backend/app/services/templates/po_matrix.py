"""
EduMetrics Templates - PO Attainment Matrix

NBA Criterion 3 & 4: Program Outcomes Attainment Matrix

This template produces the PO-Subject matrix showing
how each subject contributes to program outcomes.

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
class PODefinition:
    """PO definition data."""
    po_id: UUID
    po_code: str  # PO1-PO12, PSO1-PSO3
    po_statement: str


@dataclass
class SubjectPOContribution:
    """Subject's contribution to POs."""
    subject_code: str
    subject_name: str
    semester: int
    po_contributions: Dict[str, Dict]  # po_code -> {weighted_avg, correlation}


@dataclass
class POAttainmentData:
    """PO attainment summary data."""
    po_id: UUID
    po_code: str
    percentage: Decimal
    level: int
    contributing_cos: int


class POAttainmentMatrix(BaseTemplate):
    """
    PO Attainment Matrix Template
    
    NBA Criterion: 3 & 4
    Purpose: Show Subject × PO matrix with final attainments
    
    Data Source APIs:
    - GET /analytics/po/program/{id}/year/{y}
    - GET /analytics/po/{po_id}/cos
    """
    
    @property
    def template_name(self) -> str:
        return "po_attainment_matrix"
    
    @property
    def template_title(self) -> str:
        return "Program Outcomes Attainment Matrix"
    
    @property
    def nba_criterion(self) -> str:
        return "Criterion 3 & 4"
    
    async def render(
        self,
        # From Phase-2B API response
        program_id: UUID,
        academic_year: int,
        po_definitions: List[PODefinition],
        subject_contributions: List[SubjectPOContribution],
        final_attainments: List[POAttainmentData],
        summary: Dict,
        warnings: List[Dict],
        # Metadata
        institution_name: str = "",
        department_name: str = "",
        program_name: str = "",
        program_code: str = "",
        batch: str = "",
    ) -> ReportOutput:
        """
        Render PO Attainment Matrix.
        
        All data is pre-fetched from Phase-2B APIs.
        """
        
        metadata = self.create_metadata(
            institution_name=institution_name,
            department_name=department_name,
            program_name=program_name,
            program_code=program_code,
            batch=batch,
            academic_year=str(academic_year),
        )
        
        sections = []
        
        # Section 1: PO Definitions
        sections.append(self._create_po_definitions_section(po_definitions))
        
        # Section 2: Subject × PO Matrix
        sections.append(self._create_matrix_section(
            po_definitions=po_definitions,
            subject_contributions=subject_contributions,
            program_id=program_id,
        ))
        
        # Section 3: Final PO Attainment
        sections.append(self._create_attainment_section(
            final_attainments=final_attainments,
            program_id=program_id,
            academic_year=academic_year,
        ))
        
        # Section 4: Summary
        sections.append(self._create_summary_section(summary))
        
        return ReportOutput(
            metadata=metadata,
            title=f"{self.template_title} - {program_code}",
            sections=sections,
            warnings=warnings,
            is_complete=len(warnings) == 0,
        )
    
    def _create_po_definitions_section(
        self,
        po_definitions: List[PODefinition],
    ) -> ReportSection:
        """Create PO definitions table."""
        rows = []
        
        for po in po_definitions:
            rows.append(TableRow(
                cells=[
                    TableCell(value=po.po_code),
                    TableCell(value=po.po_statement),
                ]
            ))
        
        table = Table(
            headers=["PO Code", "Program Outcome Statement"],
            rows=rows,
            caption="Program Outcomes (PO1-PO12) and Program Specific Outcomes (PSO)",
            css_class="po-definitions-table",
        )
        
        return ReportSection(
            title="Program Outcomes Definition",
            content=table,
        )
    
    def _create_matrix_section(
        self,
        po_definitions: List[PODefinition],
        subject_contributions: List[SubjectPOContribution],
        program_id: UUID,
    ) -> ReportSection:
        """Create Subject × PO contribution matrix."""
        # Headers: Subject, Sem, PO1, PO2, ..., PO12, PSO1, ...
        po_codes = [po.po_code for po in po_definitions]
        headers = ["Subject", "Sem"] + po_codes
        
        rows = []
        for subj in subject_contributions:
            cells = [
                TableCell(value=f"{subj.subject_code}\n{subj.subject_name}"),
                TableCell(value=subj.semester),
            ]
            
            for po_code in po_codes:
                contrib = subj.po_contributions.get(po_code)
                if contrib:
                    correlation = contrib.get("correlation", 0)
                    avg = contrib.get("weighted_avg", Decimal("0"))
                    
                    # Correlation level shown as 1/2/3
                    cell = TableCell(
                        value=avg,
                        formatted=f"{correlation}" if correlation else "-",
                        css_class=f"correlation-{correlation}" if correlation else "",
                    )
                else:
                    cell = TableCell(value=None, formatted="-")
                
                cells.append(cell)
            
            rows.append(TableRow(cells=cells))
        
        table = Table(
            headers=headers,
            rows=rows,
            caption="Subject-PO Articulation Matrix (Correlation: 1=Low, 2=Medium, 3=High)",
            css_class="po-matrix-table",
        )
        
        return ReportSection(
            title="Subject × PO Articulation Matrix",
            content=table,
            notes=[
                "Values indicate correlation level (1, 2, or 3)",
                "3 = Strong correlation, 2 = Medium, 1 = Slight",
            ],
        )
    
    def _create_attainment_section(
        self,
        final_attainments: List[POAttainmentData],
        program_id: UUID,
        academic_year: int,
    ) -> ReportSection:
        """Create final PO attainment summary."""
        rows = []
        
        for po in final_attainments:
            evidence = self.create_evidence_link(
                label=f"View {po.po_code} contributing COs",
                endpoint=f"/analytics/po/{po.po_id}/cos",
                program_id=str(program_id),
                year=academic_year,
            )
            
            rows.append(TableRow(
                cells=[
                    TableCell(value=po.po_code),
                    TableCell(
                        value=po.percentage,
                        formatted=self.format_percentage(po.percentage),
                        css_class=self.level_to_css_class(po.level),
                        evidence=evidence,
                    ),
                    TableCell(
                        value=po.level,
                        formatted=self.format_level(po.level),
                    ),
                    TableCell(value=po.contributing_cos),
                ]
            ))
        
        table = Table(
            headers=["PO", "Attainment %", "Level", "Contributing COs"],
            rows=rows,
            caption="Final Program Outcome Attainment",
            css_class="po-attainment-table",
        )
        
        return ReportSection(
            title="Final PO Attainment",
            content=table,
            notes=[
                "Attainment = Weighted average of contributing CO attainments",
                "Weights based on CO-PO correlation levels",
            ],
        )
    
    def _create_summary_section(
        self,
        summary: Dict,
    ) -> ReportSection:
        """Create summary section."""
        content = {
            "total_pos": summary.get("total_pos", 0),
            "pos_attained": summary.get("pos_attained", 0),
            "average_attainment": self.format_percentage(
                summary.get("average_attainment", Decimal("0"))
            ),
        }
        
        return ReportSection(
            title="Summary",
            content=content,
        )
