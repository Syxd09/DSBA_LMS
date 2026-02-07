"""
EduMetrics Templates - Gap Analysis

Institutional Report: Weakness/Gap Identification

This template produces gap analysis views identifying
areas needing improvement based on CO/PO attainment.

PHASE-2C CONSTRAINT: Formatting only, no computation.
Gaps are identified from threshold comparisons in Phase-2B.
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
class GapEntry:
    """A gap/weakness entry."""
    identifier: str  # CO code or PO code
    description: str
    current_value: Decimal
    target_value: Decimal
    gap_magnitude: Decimal  # target - current
    suggested_action: str
    priority: str  # High, Medium, Low
    evidence_url: str


class GapAnalysisReport(BaseTemplate):
    """
    Gap Analysis Report Template
    
    Purpose: Identify areas needing improvement
    
    Data Source APIs:
    - GET /analytics/co/offering/{id}
    - GET /analytics/po/program/{id}/year/{y}
    """
    
    @property
    def template_name(self) -> str:
        return "gap_analysis"
    
    @property
    def template_title(self) -> str:
        return "Gap Analysis Report"
    
    async def render(
        self,
        # From Phase-2B (pre-identified gaps based on thresholds)
        co_gaps: List[GapEntry],
        po_gaps: List[GapEntry],
        warnings: List[Dict],
        # Metadata
        institution_name: str = "",
        department_name: str = "",
        program_name: str = "",
        batch: str = "",
        academic_year: str = "",
        analysis_context: str = "",  # e.g., "Subject: CS101" or "Program: B.Tech CSE"
    ) -> ReportOutput:
        """Render Gap Analysis Report."""
        
        metadata = self.create_metadata(
            institution_name=institution_name,
            department_name=department_name,
            program_name=program_name,
            batch=batch,
            academic_year=academic_year,
        )
        
        sections = []
        
        # Section 1: Executive Summary
        sections.append(self._create_summary_section(
            co_gaps=co_gaps,
            po_gaps=po_gaps,
            context=analysis_context,
        ))
        
        # Section 2: CO Gaps
        if co_gaps:
            sections.append(self._create_co_gaps_section(co_gaps))
        
        # Section 3: PO Gaps
        if po_gaps:
            sections.append(self._create_po_gaps_section(po_gaps))
        
        # Section 4: Suggested Actions
        sections.append(self._create_actions_section(
            co_gaps=co_gaps,
            po_gaps=po_gaps,
        ))
        
        return ReportOutput(
            metadata=metadata,
            title=f"{self.template_title} - {analysis_context}",
            sections=sections,
            warnings=warnings,
            is_complete=len(warnings) == 0,
        )
    
    def _create_summary_section(
        self,
        co_gaps: List[GapEntry],
        po_gaps: List[GapEntry],
        context: str,
    ) -> ReportSection:
        """Create executive summary section."""
        high_priority = len([g for g in co_gaps + po_gaps if g.priority == "High"])
        medium_priority = len([g for g in co_gaps + po_gaps if g.priority == "Medium"])
        low_priority = len([g for g in co_gaps + po_gaps if g.priority == "Low"])
        
        content = {
            "context": context,
            "total_gaps": len(co_gaps) + len(po_gaps),
            "co_gaps": len(co_gaps),
            "po_gaps": len(po_gaps),
            "high_priority": high_priority,
            "medium_priority": medium_priority,
            "low_priority": low_priority,
        }
        
        return ReportSection(
            title="Executive Summary",
            content=content,
            notes=[
                "Gaps identified where attainment < target threshold",
                "Priority based on gap magnitude and outcome importance",
            ],
        )
    
    def _create_co_gaps_section(
        self,
        co_gaps: List[GapEntry],
    ) -> ReportSection:
        """Create CO gaps section."""
        rows = []
        
        for gap in sorted(co_gaps, key=lambda g: g.gap_magnitude, reverse=True):
            priority_class = f"priority-{gap.priority.lower()}"
            
            rows.append(TableRow(
                cells=[
                    TableCell(value=gap.identifier),
                    TableCell(value=gap.description[:50] + "..." if len(gap.description) > 50 else gap.description),
                    TableCell(
                        value=gap.current_value,
                        formatted=self.format_percentage(gap.current_value),
                        css_class="below-target",
                    ),
                    TableCell(
                        value=gap.target_value,
                        formatted=self.format_percentage(gap.target_value),
                    ),
                    TableCell(
                        value=gap.gap_magnitude,
                        formatted=f"-{gap.gap_magnitude:.1f}%",
                        css_class="gap-magnitude",
                    ),
                    TableCell(
                        value=gap.priority,
                        css_class=priority_class,
                    ),
                ],
                css_class=priority_class,
            ))
        
        table = Table(
            headers=["CO", "Statement", "Current", "Target", "Gap", "Priority"],
            rows=rows,
            caption="Course Outcome Gaps",
            css_class="co-gaps-table",
        )
        
        return ReportSection(
            title="Course Outcome Gaps",
            content=table,
            notes=[
                "Gap = Target - Current (negative values indicate shortfall)",
            ],
        )
    
    def _create_po_gaps_section(
        self,
        po_gaps: List[GapEntry],
    ) -> ReportSection:
        """Create PO gaps section."""
        rows = []
        
        for gap in sorted(po_gaps, key=lambda g: g.gap_magnitude, reverse=True):
            rows.append(TableRow(
                cells=[
                    TableCell(value=gap.identifier),
                    TableCell(value=gap.description[:50] + "..."),
                    TableCell(
                        value=gap.current_value,
                        formatted=self.format_percentage(gap.current_value),
                    ),
                    TableCell(
                        value=gap.target_value,
                        formatted=self.format_percentage(gap.target_value),
                    ),
                    TableCell(
                        value=gap.gap_magnitude,
                        formatted=f"-{gap.gap_magnitude:.1f}%",
                    ),
                    TableCell(value=gap.priority),
                ]
            ))
        
        table = Table(
            headers=["PO", "Statement", "Current", "Target", "Gap", "Priority"],
            rows=rows,
            caption="Program Outcome Gaps",
        )
        
        return ReportSection(
            title="Program Outcome Gaps",
            content=table,
        )
    
    def _create_actions_section(
        self,
        co_gaps: List[GapEntry],
        po_gaps: List[GapEntry],
    ) -> ReportSection:
        """Create suggested actions section."""
        all_gaps = sorted(
            co_gaps + po_gaps,
            key=lambda g: (0 if g.priority == "High" else 1 if g.priority == "Medium" else 2, -g.gap_magnitude)
        )
        
        rows = []
        for gap in all_gaps[:10]:  # Top 10 actions
            rows.append(TableRow(
                cells=[
                    TableCell(value=gap.priority),
                    TableCell(value=gap.identifier),
                    TableCell(value=gap.suggested_action),
                ]
            ))
        
        table = Table(
            headers=["Priority", "Outcome", "Suggested Action"],
            rows=rows,
            caption="Recommended Improvement Actions",
            css_class="actions-table",
        )
        
        return ReportSection(
            title="Suggested Improvement Actions",
            content=table,
            notes=[
                "Actions are descriptive suggestions, not prescriptive mandates",
                "Implementation depends on institutional context and resources",
            ],
        )
