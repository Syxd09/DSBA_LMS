"""
EduMetrics Templates Layer - Base Classes

PHASE-2C CONSTRAINT: Templates are formatting-only.
- No computation logic (all data from Phase-2B)
- No caching or storage
- Read-only Phase-2B API consumption

All templates extend BaseTemplate and implement render().
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, TypeVar, Generic
from uuid import UUID


@dataclass
class ReportMetadata:
    """Standard metadata for all reports."""
    institution_name: str = ""
    institution_code: str = ""
    department_name: str = ""
    program_name: str = ""
    program_code: str = ""
    batch: str = ""
    academic_year: str = ""
    semester: Optional[int] = None
    generated_at: datetime = field(default_factory=datetime.utcnow)
    generated_by: str = "System"
    source_version: str = "Phase-2C v1.0"


@dataclass
class EvidenceLink:
    """
    Link to drill-down evidence.
    
    Every reported number must be traceable.
    """
    label: str
    endpoint: str  # Phase-2B API endpoint
    params: Dict[str, Any] = field(default_factory=dict)
    
    def to_url(self, base_url: str = "/api/v1") -> str:
        """Generate full API URL for drill-down."""
        url = f"{base_url}{self.endpoint}"
        if self.params:
            params_str = "&".join(f"{k}={v}" for k, v in self.params.items())
            url = f"{url}?{params_str}"
        return url


@dataclass
class TableCell:
    """A cell in a report table."""
    value: Any
    formatted: str = ""
    evidence: Optional[EvidenceLink] = None
    css_class: str = ""
    colspan: int = 1
    rowspan: int = 1
    
    def __post_init__(self):
        if not self.formatted:
            if isinstance(self.value, Decimal):
                self.formatted = f"{self.value:.2f}"
            elif self.value is None:
                self.formatted = "-"
            else:
                self.formatted = str(self.value)


@dataclass
class TableRow:
    """A row in a report table."""
    cells: List[TableCell]
    is_header: bool = False
    is_footer: bool = False
    css_class: str = ""


@dataclass
class Table:
    """A table in a report."""
    headers: List[str]
    rows: List[TableRow]
    caption: str = ""
    css_class: str = ""
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "headers": self.headers,
            "rows": [
                {
                    "cells": [
                        {
                            "value": c.value,
                            "formatted": c.formatted,
                            "evidence_url": c.evidence.to_url() if c.evidence else None,
                        }
                        for c in row.cells
                    ],
                    "is_header": row.is_header,
                    "is_footer": row.is_footer,
                }
                for row in self.rows
            ],
            "caption": self.caption,
        }


T = TypeVar("T")


@dataclass
class ReportSection(Generic[T]):
    """A section of a report."""
    title: str
    content: T
    subsections: List["ReportSection"] = field(default_factory=list)
    evidence: Optional[EvidenceLink] = None
    notes: List[str] = field(default_factory=list)


@dataclass
class ReportOutput:
    """
    Standard output for all templates.
    
    Contains:
    - Metadata (institution, dates, etc.)
    - Sections (tables, summaries, etc.)
    - Evidence links for audit
    - Warnings from Phase-2B
    """
    metadata: ReportMetadata
    title: str
    sections: List[ReportSection]
    warnings: List[Dict[str, Any]] = field(default_factory=list)
    is_complete: bool = True
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON/export."""
        return {
            "metadata": {
                "institution_name": self.metadata.institution_name,
                "department_name": self.metadata.department_name,
                "program_name": self.metadata.program_name,
                "batch": self.metadata.batch,
                "academic_year": self.metadata.academic_year,
                "semester": self.metadata.semester,
                "generated_at": self.metadata.generated_at.isoformat(),
                "generated_by": self.metadata.generated_by,
                "source_version": self.metadata.source_version,
            },
            "title": self.title,
            "sections": [self._section_to_dict(s) for s in self.sections],
            "warnings": self.warnings,
            "is_complete": self.is_complete,
        }
    
    def _section_to_dict(self, section: ReportSection) -> Dict:
        """Convert section to dictionary."""
        content = section.content
        if isinstance(content, Table):
            content = content.to_dict()
        elif isinstance(content, dict):
            pass
        elif hasattr(content, "to_dict"):
            content = content.to_dict()
        else:
            content = str(content)
        
        return {
            "title": section.title,
            "content": content,
            "subsections": [self._section_to_dict(s) for s in section.subsections],
            "evidence_url": section.evidence.to_url() if section.evidence else None,
            "notes": section.notes,
        }


class BaseTemplate(ABC):
    """
    Abstract base class for all NBA/NAAC templates.
    
    PHASE-2C CONSTRAINTS (enforced by design):
    1. Templates consume Phase-2B APIs only
    2. No computation logic inside templates
    3. All data formatting, no data transformation
    4. Every value must have evidence link
    """
    
    def __init__(self, api_base_url: str = "/api/v1"):
        self.api_base_url = api_base_url
    
    @property
    @abstractmethod
    def template_name(self) -> str:
        """Unique template identifier."""
        pass
    
    @property
    @abstractmethod
    def template_title(self) -> str:
        """Human-readable template title."""
        pass
    
    @property
    def nba_criterion(self) -> Optional[str]:
        """NBA criterion this template addresses (if any)."""
        return None
    
    @property
    def naac_metric(self) -> Optional[str]:
        """NAAC metric this template addresses (if any)."""
        return None
    
    @abstractmethod
    async def render(self, **kwargs) -> ReportOutput:
        """
        Render the template with provided data.
        
        Must call Phase-2B APIs to fetch data.
        Must NOT perform any computation.
        """
        pass
    
    def create_metadata(
        self,
        institution_name: str = "",
        department_name: str = "",
        program_name: str = "",
        program_code: str = "",
        batch: str = "",
        academic_year: str = "",
        semester: Optional[int] = None,
    ) -> ReportMetadata:
        """Create standard report metadata."""
        return ReportMetadata(
            institution_name=institution_name,
            department_name=department_name,
            program_name=program_name,
            program_code=program_code,
            batch=batch,
            academic_year=academic_year,
            semester=semester,
        )
    
    def create_evidence_link(
        self,
        label: str,
        endpoint: str,
        **params
    ) -> EvidenceLink:
        """Create evidence link for drill-down."""
        return EvidenceLink(
            label=label,
            endpoint=endpoint,
            params=params
        )
    
    def format_percentage(self, value: Decimal) -> str:
        """Format percentage with 2 decimal places."""
        return f"{value:.2f}%"
    
    def format_level(self, level: int) -> str:
        """Format attainment level."""
        level_names = {
            0: "Not Attained",
            1: "Level 1",
            2: "Level 2",
            3: "Level 3",
        }
        return level_names.get(level, f"Level {level}")
    
    def level_to_css_class(self, level: int) -> str:
        """Get CSS class for attainment level."""
        css_classes = {
            0: "level-0 not-attained",
            1: "level-1 low",
            2: "level-2 medium",
            3: "level-3 high",
        }
        return css_classes.get(level, "")
