"""
EduMetrics Templates API - Report Endpoints

READ-ONLY endpoints for generating NBA/NAAC template reports.

RBAC: TEMPLATE_CO_REPORT, TEMPLATE_PO_MATRIX, TEMPLATE_STUDENT_REPORT permissions required
"""
from enum import Enum
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO

from app.database import get_db
from app.api.deps import PermissionChecker, Permission


class ExportFormat(str, Enum):
    JSON = "json"
    PDF = "pdf"
    XLSX = "xlsx"


router = APIRouter(prefix="/templates", tags=["Templates - NBA/NAAC Reports"])


# ============================================================================
# CO ATTAINMENT REPORT
# ============================================================================

@router.get(
    "/co-attainment/{offering_id}",
    summary="CO Attainment Report",
    description="Generate CO Attainment Report (NBA Criterion 3 & 4). RBAC: TEMPLATE_CO_REPORT.",
    dependencies=[Depends(PermissionChecker(Permission.TEMPLATE_CO_REPORT))]
)
async def get_co_attainment_report(
    offering_id: UUID,
    format: ExportFormat = Query(default=ExportFormat.JSON),
    institution_name: str = Query(default=""),
    department_name: str = Query(default=""),
    program_name: str = Query(default=""),
    batch: str = Query(default=""),
    semester: int = Query(default=1),
    academic_year: str = Query(default=""),
    db: Session = Depends(get_db)
):
    """Generate CO Attainment Report."""
    from app.services.templates import COAttainmentReport
    from app.services.templates.co_attainment import CODefinition, COAttainmentData
    from app.services.analytics.co_service import compute_offering_co_attainments
    from decimal import Decimal
    
    try:
        # Fetch data from Phase-2B
        co_response = await compute_offering_co_attainments(db=db, offering_id=offering_id)
        
        if not co_response.data:
            raise HTTPException(status_code=404, detail="No CO data found")
        
        # Transform Phase-2B data to template format
        co_definitions = []
        co_attainments = []
        
        for co in co_response.data.cos:
            co_definitions.append(CODefinition(
                co_id=co.co_id,
                co_code=co.co_code,
                co_statement=co.co_statement,
            ))
            
            co_attainments.append(COAttainmentData(
                co_id=co.co_id,
                co_code=co.co_code,
                internal_percentage=co.internal_attainment.percentage,
                internal_level=co.internal_attainment.level,
                external_percentage=co.external_attainment.percentage,
                external_level=co.external_attainment.level,
                final_percentage=co.final_attainment.percentage,
                final_level=co.final_attainment.level,
                threshold=co.internal_attainment.threshold,
                target_met=co.final_attainment.level >= 1,
            ))
        
        # Render template
        template = COAttainmentReport()
        report = await template.render(
            offering_id=offering_id,
            subject_code="",  # Would fetch from DB
            subject_name="",
            co_definitions=co_definitions,
            co_attainments=co_attainments,
            summary={
                "total_cos": co_response.data.summary.total_cos,
                "cos_attained": co_response.data.summary.cos_attained,
                "average_attainment": co_response.data.summary.average_attainment,
            },
            warnings=[w.dict() if hasattr(w, 'dict') else w for w in co_response.warnings],
            institution_name=institution_name,
            department_name=department_name,
            program_name=program_name,
            batch=batch,
            semester=semester,
            academic_year=academic_year,
        )
        
        # Export
        return _export_report(report, format, f"co_attainment_{offering_id}")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")


# ============================================================================
# PO ATTAINMENT MATRIX
# ============================================================================

@router.get(
    "/po-matrix/{program_id}",
    summary="PO Attainment Matrix",
    description="Generate PO Attainment Matrix (NBA Criterion 3 & 4). RBAC: TEMPLATE_PO_MATRIX.",
    dependencies=[Depends(PermissionChecker(Permission.TEMPLATE_PO_MATRIX))]
)
async def get_po_matrix_report(
    program_id: UUID,
    year: int = Query(..., description="Academic year"),
    offering_ids: List[UUID] = Query(..., description="Offering IDs"),
    format: ExportFormat = Query(default=ExportFormat.JSON),
    institution_name: str = Query(default=""),
    department_name: str = Query(default=""),
    program_name: str = Query(default=""),
    program_code: str = Query(default=""),
    batch: str = Query(default=""),
    db: Session = Depends(get_db)
):
    """Generate PO Attainment Matrix."""
    from app.services.templates import POAttainmentMatrix
    from app.services.templates.po_matrix import PODefinition, POAttainmentData
    from app.services.analytics.po_service import compute_program_po_attainments
    
    try:
        # Fetch data from Phase-2B
        po_response = await compute_program_po_attainments(
            db=db,
            program_id=program_id,
            academic_year=year,
            offering_ids=offering_ids
        )
        
        if not po_response.data:
            raise HTTPException(status_code=404, detail="No PO data found")
        
        # Transform
        po_definitions = [
            PODefinition(
                po_id=po.po_id,
                po_code=po.po_code,
                po_statement=po.po_statement,
            )
            for po in po_response.data.pos
        ]
        
        final_attainments = [
            POAttainmentData(
                po_id=po.po_id,
                po_code=po.po_code,
                percentage=po.attainment_percentage,
                level=po.attainment_level,
                contributing_cos=len(po.contributing_cos),
            )
            for po in po_response.data.pos
        ]
        
        # Render
        template = POAttainmentMatrix()
        report = await template.render(
            program_id=program_id,
            academic_year=year,
            po_definitions=po_definitions,
            subject_contributions=[],  # Would build from offerings
            final_attainments=final_attainments,
            summary={
                "total_pos": po_response.data.summary.total_pos,
                "pos_attained": po_response.data.summary.pos_attained,
                "average_attainment": po_response.data.summary.average_attainment,
            },
            warnings=[w.dict() if hasattr(w, 'dict') else w for w in po_response.warnings],
            institution_name=institution_name,
            department_name=department_name,
            program_name=program_name,
            program_code=program_code,
            batch=batch,
        )
        
        return _export_report(report, format, f"po_matrix_{program_id}")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")


# ============================================================================
# STUDENT PERFORMANCE
# ============================================================================

@router.get(
    "/student-performance/{usn}",
    summary="Student Performance Report",
    description="Generate Student Performance Analysis (NAAC 2.6.1, 2.6.2). RBAC: TEMPLATE_STUDENT_REPORT.",
    dependencies=[Depends(PermissionChecker(Permission.TEMPLATE_STUDENT_REPORT))]
)
async def get_student_performance_report(
    usn: str,
    format: ExportFormat = Query(default=ExportFormat.JSON),
    institution_name: str = Query(default=""),
    department_name: str = Query(default=""),
    program_name: str = Query(default=""),
    batch: str = Query(default=""),
    student_name: str = Query(default=""),
    db: Session = Depends(get_db)
):
    """Generate Student Performance Report."""
    from app.services.templates import StudentPerformanceReport
    from app.services.templates.student_performance import SemesterPerformance
    from decimal import Decimal
    
    try:
        # Placeholder - would fetch from Phase-2B CGPA API
        # For now, return structure
        template = StudentPerformanceReport()
        report = await template.render(
            usn=usn,
            student_name=student_name,
            batch=batch,
            program_name=program_name,
            semester_performance=[],
            cgpa=Decimal("0"),
            total_credits=0,
            backlogs_pending=0,
            backlogs_cleared=0,
            co_achievement=[],
            warnings=[],
            institution_name=institution_name,
            department_name=department_name,
        )
        
        return _export_report(report, format, f"student_{usn}")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")


# ============================================================================
# PSO MATRIX REPORT
# ============================================================================

@router.get(
    "/pso-matrix/{program_id}",
    summary="PSO Attainment Matrix",
    description="Generate PSO Attainment Matrix. RBAC: TEMPLATE_PO_MATRIX.",
    dependencies=[Depends(PermissionChecker(Permission.TEMPLATE_PO_MATRIX))]
)
async def get_pso_matrix_report(
    program_id: UUID,
    year: int = Query(..., description="Academic year"),
    format: ExportFormat = Query(default=ExportFormat.JSON),
    institution_name: str = Query(default=""),
    department_name: str = Query(default=""),
    program_name: str = Query(default=""),
    db: Session = Depends(get_db)
):
    """Generate PSO Attainment Matrix Report."""
    from app.models import ProgramSpecificOutcome, COPSOMapping
    
    try:
        # Get PSOs for program
        psos = db.query(ProgramSpecificOutcome).filter(
            ProgramSpecificOutcome.program_id == program_id
        ).order_by(ProgramSpecificOutcome.pso_number).all()
        
        pso_data = []
        for pso in psos:
            mappings = db.query(COPSOMapping).filter(
                COPSOMapping.pso_id == pso.id
            ).all()
            
            pso_data.append({
                "pso_code": pso.pso_code,
                "pso_number": pso.pso_number,
                "description": pso.description,
                "threshold": float(pso.threshold),
                "contributing_cos": len(mappings),
            })
        
        report_data = {
            "program_id": str(program_id),
            "academic_year": year,
            "institution_name": institution_name,
            "department_name": department_name,
            "program_name": program_name,
            "pso_count": len(psos),
            "psos": pso_data,
            "generated_at": datetime.utcnow().isoformat(),
        }
        
        if format == ExportFormat.JSON:
            return report_data
        
        # For PDF/XLSX, we need a proper template structure
        # Return JSON for now with a message about format
        return report_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")


# ============================================================================
# NAAC COMPLIANCE REPORTS
# ============================================================================

from datetime import datetime


@router.get(
    "/naac/criterion-2/{program_id}",
    summary="NAAC Criterion 2 Report",
    description="""
    Generate NAAC Criterion 2 (Teaching-Learning and Evaluation) report.
    Covers: 2.6.1 (Student Pass %), 2.6.2 (Attainment of COs/POs).
    """,
    dependencies=[Depends(PermissionChecker(Permission.TEMPLATE_PO_MATRIX))]
)
async def get_naac_criterion_2_report(
    program_id: UUID,
    year: int = Query(..., description="Academic year"),
    format: ExportFormat = Query(default=ExportFormat.JSON),
    institution_name: str = Query(default=""),
    program_name: str = Query(default=""),
    db: Session = Depends(get_db)
):
    """Generate NAAC Criterion 2 compliance report."""
    from app.models import Program, Cohort, ProgramOutcome, Student, Exam
    
    try:
        program = db.query(Program).filter(Program.id == program_id).first()
        if not program:
            raise HTTPException(status_code=404, detail="Program not found")
        
        # Get cohorts for this program
        cohorts = db.query(Cohort).filter(
            Cohort.program_id == program_id
        ).all()
        
        # Get POs
        pos = db.query(ProgramOutcome).filter(
            ProgramOutcome.program_id == program_id
        ).order_by(ProgramOutcome.po_number).all()
        
        # Build 2.6.1 data (Student Pass Percentage)
        pass_percentage_data = []
        for cohort in cohorts:
            total_students = db.query(Student).filter(
                Student.cohort_id == cohort.id
            ).count()
            
            pass_percentage_data.append({
                "batch": cohort.name,
                "year": cohort.year,
                "total_students": total_students,
                "passed_students": 0,  # Would be computed from final results
                "pass_percentage": 0.0,
            })
        
        # Build 2.6.2 data (CO/PO Attainment)
        po_attainment_data = []
        for po in pos:
            po_attainment_data.append({
                "po_code": po.po_code,
                "po_number": po.po_number,
                "statement": po.description,
                "threshold": float(po.threshold),
                "attainment_percentage": 0.0,  # Would be computed
                "attained": False,
            })
        
        report_data = {
            "report_type": "NAAC_CRITERION_2",
            "program_id": str(program_id),
            "program_name": program_name or program.name,
            "academic_year": year,
            "institution_name": institution_name,
            "generated_at": datetime.utcnow().isoformat(),
            
            "criterion_2_6_1": {
                "title": "Student Pass Percentage",
                "data": pass_percentage_data,
            },
            
            "criterion_2_6_2": {
                "title": "Attainment of COs and POs",
                "total_pos": len(pos),
                "pos_attained": 0,
                "data": po_attainment_data,
            },
            
            "notes": [
                "Actual attainment values require CO marks computation",
                "Pass percentage based on final semester results",
            ]
        }
        
        return report_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")


@router.get(
    "/naac/criterion-3/{program_id}",
    summary="NAAC Criterion 3 Report",
    description="""
    Generate NAAC Criterion 3 (Research, Innovations and Extension) framework data.
    Note: Full Criterion 3 requires additional data beyond OBE scope.
    """,
    dependencies=[Depends(PermissionChecker(Permission.TEMPLATE_PO_MATRIX))]
)
async def get_naac_criterion_3_report(
    program_id: UUID,
    year: int = Query(..., description="Academic year"),
    format: ExportFormat = Query(default=ExportFormat.JSON),
    db: Session = Depends(get_db)
):
    """Generate NAAC Criterion 3 framework (limited scope for OBE system)."""
    
    return {
        "report_type": "NAAC_CRITERION_3",
        "program_id": str(program_id),
        "academic_year": year,
        "generated_at": datetime.utcnow().isoformat(),
        "note": "Criterion 3 focuses on Research & Innovation - data sources beyond OBE scope",
        "obe_related_metrics": {
            "innovative_teaching_practices": [],
            "project_based_learning": [],
        }
    }


# ============================================================================
# NBA SAR TEMPLATE
# ============================================================================

@router.get(
    "/nba/sar/{program_id}",
    summary="NBA Self-Assessment Report Data",
    description="""
    Generate NBA SAR (Self-Assessment Report) data for accreditation.
    Covers Criterion 3 (POs), Criterion 4 (COs).
    """,
    dependencies=[Depends(PermissionChecker(Permission.TEMPLATE_PO_MATRIX))]
)
async def get_nba_sar_report(
    program_id: UUID,
    year: int = Query(..., description="Academic year"),
    format: ExportFormat = Query(default=ExportFormat.JSON),
    institution_name: str = Query(default=""),
    program_name: str = Query(default=""),
    db: Session = Depends(get_db)
):
    """Generate NBA SAR data structure."""
    from app.models import Program, ProgramOutcome, ProgramSpecificOutcome
    
    try:
        program = db.query(Program).filter(Program.id == program_id).first()
        if not program:
            raise HTTPException(status_code=404, detail="Program not found")
        
        pos = db.query(ProgramOutcome).filter(
            ProgramOutcome.program_id == program_id
        ).order_by(ProgramOutcome.po_number).all()
        
        psos = db.query(ProgramSpecificOutcome).filter(
            ProgramSpecificOutcome.program_id == program_id
        ).order_by(ProgramSpecificOutcome.pso_number).all()
        
        return {
            "report_type": "NBA_SAR",
            "program_id": str(program_id),
            "program_name": program_name or program.name,
            "program_code": program.code,
            "academic_year": year,
            "institution_name": institution_name,
            "generated_at": datetime.utcnow().isoformat(),
            
            "criterion_3": {
                "title": "Program Outcomes",
                "total_pos": len(pos),
                "pos": [
                    {
                        "po_code": po.po_code,
                        "po_number": po.po_number,
                        "statement": po.description,
                        "threshold": float(po.threshold),
                    }
                    for po in pos
                ],
            },
            
            "criterion_4": {
                "title": "Course Outcomes & Attainment",
                "note": "CO data requires subject offerings - call per-offering endpoints",
            },
            
            "psos": {
                "title": "Program Specific Outcomes",
                "total_psos": len(psos),
                "psos": [
                    {
                        "pso_code": pso.pso_code,
                        "pso_number": pso.pso_number,
                        "statement": pso.description,
                        "threshold": float(pso.threshold),
                    }
                    for pso in psos
                ],
            },
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _export_report(report, format: ExportFormat, filename_base: str):
    """Export report in requested format."""
    if format == ExportFormat.JSON:
        return report.to_dict()
    
    elif format == ExportFormat.PDF:
        try:
            from app.services.templates.exporters.pdf import PDFExporter
            exporter = PDFExporter()
            pdf_bytes = exporter.export(report)
            
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename={filename_base}.pdf"
                }
            )
        except ImportError:
            raise HTTPException(
                status_code=501,
                detail="PDF export requires weasyprint. Install with: pip install weasyprint"
            )
    
    elif format == ExportFormat.XLSX:
        try:
            from app.services.templates.exporters.excel import ExcelExporter
            exporter = ExcelExporter()
            xlsx_bytes = exporter.export(report)
            
            return Response(
                content=xlsx_bytes,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={
                    "Content-Disposition": f"attachment; filename={filename_base}.xlsx"
                }
            )
        except ImportError:
            raise HTTPException(
                status_code=501,
                detail="Excel export requires openpyxl. Install with: pip install openpyxl"
            )
    
    raise HTTPException(status_code=400, detail=f"Unknown format: {format}")
