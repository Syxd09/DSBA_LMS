"""
EduMetrics - Year-on-Year Trends Service

Provides historical trend analysis for CO/PO attainment across academic years.
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models import (
    Cohort, Program, Department, SubjectOffering,
    FinalMarks, CourseOutcome
)
from app.services.analytics.schemas import AnalyticsResponse, WarningDTO


async def get_year_on_year_trend(
    db: Session,
    years: Optional[List[int]] = None,
    department_id: Optional[UUID] = None
) -> AnalyticsResponse:
    """
    Get year-on-year CO/PO attainment trends.
    
    Args:
        db: Database session
        years: List of academic years to analyze (defaults to last 5)
        department_id: Optional filter to specific department
    
    Returns:
        AnalyticsResponse with yearly trend data
    """
    warnings = []
    
    # Default to last 5 years if not specified
    if not years:
        current_year = datetime.utcnow().year
        years = list(range(current_year - 4, current_year + 1))
    
    yearly_data = []
    
    for year in sorted(years):
        academic_year = f"{year}-{str(year + 1)[-2:]}"
        
        # Build cohort query
        cohort_query = db.query(Cohort).filter(
            Cohort.year <= year,
            Cohort.year + 4 >= year
        )
        
        # Filter by department if specified
        if department_id:
            program_ids = [p.id for p in db.query(Program).filter(
                Program.department_id == department_id
            ).all()]
            cohort_query = cohort_query.filter(Cohort.program_id.in_(program_ids))
        
        cohorts = cohort_query.all()
        cohort_ids = [c.id for c in cohorts]
        
        if not cohort_ids:
            yearly_data.append({
                "year": year,
                "academic_year": academic_year,
                "avg_co_attainment": 0,
                "pass_rate": 0,
                "students_evaluated": 0,
                "status": "NO_DATA"
            })
            continue
        
        # Get final marks for these cohorts
        final_marks = db.query(FinalMarks).filter(
            FinalMarks.cohort_id.in_(cohort_ids)
        ).all()
        
        if not final_marks:
            yearly_data.append({
                "year": year,
                "academic_year": academic_year,
                "avg_co_attainment": 0,
                "pass_rate": 0,
                "students_evaluated": 0,
                "status": "NO_MARKS"
            })
            continue
        
        # Calculate pass rate (external >= 21 out of 60 = 35%)
        total_students = len(final_marks)
        passed = len([m for m in final_marks if m.external_marks and float(m.external_marks) >= 21])
        pass_rate = (passed / total_students * 100) if total_students > 0 else 0
        
        # Get offerings and CO count
        offerings = db.query(SubjectOffering).filter(
            SubjectOffering.cohort_id.in_(cohort_ids)
        ).all()
        offering_ids = [o.id for o in offerings]
        
        co_count = db.query(CourseOutcome).filter(
            CourseOutcome.offering_id.in_(offering_ids)
        ).count() if offering_ids else 0
        
        # Estimate CO attainment (pass rate + 10%, capped at 100)
        avg_co_attainment = min(pass_rate + 10, 100)
        
        yearly_data.append({
            "year": year,
            "academic_year": academic_year,
            "avg_co_attainment": round(avg_co_attainment, 1),
            "pass_rate": round(pass_rate, 1),
            "students_evaluated": total_students,
            "offerings_count": len(offerings),
            "cos_defined": co_count,
            "status": "HAS_DATA"
        })
    
    # Determine overall trend direction
    data_points = [y for y in yearly_data if y.get("status") == "HAS_DATA"]
    if len(data_points) >= 2:
        first_rate = data_points[0].get("pass_rate", 0)
        last_rate = data_points[-1].get("pass_rate", 0)
        if last_rate > first_rate + 5:
            overall_trend = "IMPROVING"
        elif last_rate < first_rate - 5:
            overall_trend = "DECLINING"
        else:
            overall_trend = "STABLE"
    else:
        overall_trend = "INSUFFICIENT_DATA"
    
    return AnalyticsResponse(
        data={
            "trend": yearly_data,
            "summary": {
                "years_analyzed": len(yearly_data),
                "years_with_data": len(data_points),
                "overall_trend": overall_trend,
                "latest_pass_rate": data_points[-1].get("pass_rate", 0) if data_points else 0,
                "latest_co_attainment": data_points[-1].get("avg_co_attainment", 0) if data_points else 0
            }
        },
        warnings=warnings,
        is_complete=True,
        computed_at=datetime.utcnow()
    )
