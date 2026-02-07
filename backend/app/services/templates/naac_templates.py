"""
EduMetrics Template Layer - NAAC Templates

NAAC Criterion-2 (Teaching, Learning, and Evaluation) and 
Criterion-3 (Research, Innovations, and Extension) data generation.

These templates produce data structures ready for NAAC SSR format.
"""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import List, Dict, Optional, Any
from datetime import datetime


@dataclass
class NAACCriterion2Metric:
    """Single metric for NAAC Criterion-2."""
    metric_code: str  # e.g., "2.6.1", "2.6.2"
    metric_name: str
    value: Any
    unit: str  # "percentage", "number", "ratio"
    benchmark: Optional[Decimal] = None
    achieved: bool = True
    remarks: str = ""


@dataclass
class NAACCriterion2Result:
    """
    NAAC Criterion-2 data aggregation.
    
    Key Metrics:
    - 2.6.1: Programme and course outcomes
    - 2.6.2: Attainment of programme outcomes (PO/PSO)
    - 2.6.3: Pass percentage of students
    """
    academic_year: str
    program_code: str
    program_name: str
    metrics: List[NAACCriterion2Metric]
    overall_score: Decimal
    compliance_level: str  # "A++", "A+", "A", "B++", "B+", "B", "C", "D"
    generated_at: datetime = field(default_factory=datetime.utcnow)


def generate_naac_criterion_2(
    program_data: Dict,
    co_attainments: List[Dict],
    po_attainments: List[Dict],
    pso_attainments: List[Dict],
    pass_percentage: Decimal,
    academic_year: str
) -> NAACCriterion2Result:
    """
    Generate NAAC Criterion-2 compliant data.
    
    Args:
        program_data: Program details (code, name, etc.)
        co_attainments: List of CO attainment results
        po_attainments: List of PO attainment results
        pso_attainments: List of PSO attainment results
        pass_percentage: Overall pass percentage
        academic_year: Academic year string (e.g., "2025-26")
        
    Returns:
        NAACCriterion2Result with formatted metrics
    """
    metrics = []
    
    # 2.6.1: Programme and course outcomes defined and displayed
    co_count = len(co_attainments)
    po_count = len(po_attainments)
    pso_count = len(pso_attainments)
    
    metrics.append(NAACCriterion2Metric(
        metric_code="2.6.1",
        metric_name="Programme and Course Outcomes",
        value={
            "course_outcomes_defined": co_count,
            "programme_outcomes_defined": po_count,
            "programme_specific_outcomes_defined": pso_count,
            "displayed_on_website": True  # Assumed
        },
        unit="composite",
        achieved=co_count > 0 and po_count > 0
    ))
    
    # 2.6.2: Attainment of programme outcomes
    avg_po_attainment = (
        sum(Decimal(str(po.get("attainment_percentage", 0))) for po in po_attainments) / Decimal(str(len(po_attainments)))
        if po_attainments else Decimal("0")
    )
    avg_pso_attainment = (
        sum(Decimal(str(pso.get("attainment_percentage", 0))) for pso in pso_attainments) / Decimal(str(len(pso_attainments)))
        if pso_attainments else Decimal("0")
    )
    
    # NBA threshold: 60% attainment for Level 2
    po_threshold_met = avg_po_attainment >= Decimal("60")
    
    metrics.append(NAACCriterion2Metric(
        metric_code="2.6.2",
        metric_name="Attainment of Programme Outcomes",
        value={
            "average_po_attainment": float(avg_po_attainment),
            "average_pso_attainment": float(avg_pso_attainment),
            "po_threshold_met": po_threshold_met,
            "measurement_method": "Direct & Indirect Assessment"
        },
        unit="percentage",
        benchmark=Decimal("60"),
        achieved=po_threshold_met
    ))
    
    # 2.6.3: Pass percentage
    pass_threshold = Decimal("70")  # NAAC expects >70%
    
    metrics.append(NAACCriterion2Metric(
        metric_code="2.6.3",
        metric_name="Pass Percentage",
        value={
            "pass_percentage": float(pass_percentage),
            "year": academic_year
        },
        unit="percentage",
        benchmark=pass_threshold,
        achieved=pass_percentage >= pass_threshold
    ))
    
    # Calculate overall score (simplified)
    achieved_count = sum(1 for m in metrics if m.achieved)
    overall = Decimal(str(achieved_count)) / Decimal(str(len(metrics))) * Decimal("100")
    
    # Determine compliance level
    if overall >= Decimal("90"):
        compliance = "A++"
    elif overall >= Decimal("80"):
        compliance = "A+"
    elif overall >= Decimal("70"):
        compliance = "A"
    elif overall >= Decimal("60"):
        compliance = "B++"
    elif overall >= Decimal("50"):
        compliance = "B+"
    else:
        compliance = "B"
    
    return NAACCriterion2Result(
        academic_year=academic_year,
        program_code=program_data.get("code", ""),
        program_name=program_data.get("name", ""),
        metrics=metrics,
        overall_score=overall,
        compliance_level=compliance
    )


@dataclass
class NAACCriterion3Metric:
    """Single metric for NAAC Criterion-3."""
    metric_code: str
    metric_name: str
    value: Any
    unit: str
    remarks: str = ""


@dataclass
class NAACCriterion3Result:
    """
    NAAC Criterion-3 data aggregation.
    
    Key Metrics (for academic context):
    - 3.4.3: Research publications
    - 3.4.4: Patents
    - 3.5.1: Revenue from consultancy
    """
    academic_year: str
    department_name: str
    metrics: List[NAACCriterion3Metric]
    generated_at: datetime = field(default_factory=datetime.utcnow)


def generate_naac_criterion_3(
    department_data: Dict,
    faculty_research_data: List[Dict],
    academic_year: str
) -> NAACCriterion3Result:
    """
    Generate NAAC Criterion-3 compliant data.
    
    Note: This is primarily for research metrics, which may be 
    out of scope for the academic management system. This template
    provides the data structure for future integration.
    
    Args:
        department_data: Department details
        faculty_research_data: Research publications, patents, etc.
        academic_year: Academic year string
        
    Returns:
        NAACCriterion3Result with formatted metrics
    """
    metrics = []
    
    # Count publications by type
    publications = [f for f in faculty_research_data if f.get("type") == "publication"]
    patents = [f for f in faculty_research_data if f.get("type") == "patent"]
    
    metrics.append(NAACCriterion3Metric(
        metric_code="3.4.3",
        metric_name="Research Publications",
        value={
            "total_publications": len(publications),
            "journals": sum(1 for p in publications if p.get("category") == "journal"),
            "conferences": sum(1 for p in publications if p.get("category") == "conference")
        },
        unit="number"
    ))
    
    metrics.append(NAACCriterion3Metric(
        metric_code="3.4.4",
        metric_name="Patents Published/Granted",
        value={
            "total_patents": len(patents),
            "granted": sum(1 for p in patents if p.get("status") == "granted"),
            "published": sum(1 for p in patents if p.get("status") == "published")
        },
        unit="number"
    ))
    
    return NAACCriterion3Result(
        academic_year=academic_year,
        department_name=department_data.get("name", ""),
        metrics=metrics
    )


# NBA Format Helpers
def format_for_nba_sar(
    criterion_2: NAACCriterion2Result,
    co_po_matrix: List[Dict]
) -> Dict:
    """
    Format data for NBA Self-Assessment Report (SAR).
    
    Structures data ready for NBA format tables:
    - Table 5.1: CO-PO/PSO Mapping
    - Table 5.2: Attainment Calculation
    
    Args:
        criterion_2: NAAC Criterion-2 result
        co_po_matrix: CO-PO mapping matrix data
        
    Returns:
        Dict with NBA SAR formatted data
    """
    return {
        "program_code": criterion_2.program_code,
        "academic_year": criterion_2.academic_year,
        "table_5_1": {
            "title": "CO-PO/PSO Mapping",
            "data": co_po_matrix
        },
        "table_5_2": {
            "title": "Attainment Calculation",
            "direct_attainment": next(
                (m.value for m in criterion_2.metrics if m.metric_code == "2.6.2"),
                {}
            ),
            "pass_percentage": next(
                (m.value for m in criterion_2.metrics if m.metric_code == "2.6.3"),
                {}
            )
        },
        "overall_compliance": criterion_2.compliance_level
    }
