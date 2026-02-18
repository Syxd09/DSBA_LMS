"""
EduMetrics Backend - Reporting API

Generates official reports for NBA/NAAC compliance.
- Course File (PDF): Syllabus, CO-PO, Attainment.
- Program File (PDF): Curriculum, POs.
- Attainment Summary (Excel): Bulk export.
"""
import io
from uuid import UUID
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from openpyxl import Workbook

from app.database import get_db
from app.api.deps import require_authenticated, PermissionChecker
from app.core.policies import Permission
from app.models import (
    Profile, SubjectOffering, CourseOutcome, ProgramOutcome, 
    COPOMapping, Exam, Assignment
)

router = APIRouter(prefix="/reports", tags=["Reporting Engine"])


# ============================================================================
# PDF HELPERS
# ============================================================================

def create_header(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica-Bold', 12)
    canvas.drawCentredString(A4[0]/2.0, A4[1]-50, "Outcome Based Education System")
    canvas.setFont('Helvetica', 10)
    canvas.drawCentredString(A4[0]/2.0, A4[1]-65, "Authorized Course File")
    canvas.line(50, A4[1]-75, A4[0]-50, A4[1]-75)
    canvas.restoreState()

def create_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 9)
    page_num = canvas.getPageNumber()
    text = "Page %s" % page_num
    canvas.drawRightString(A4[0]-50, 50, text)
    canvas.drawString(50, 50, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    canvas.restoreState()

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get(
    "/course-file/{offering_id}",
    summary="Download Course File (PDF)",
    description="Generates a complete Course File PDF for NBA audit. RBAC: TEACHER/HOD.",
    dependencies=[Depends(require_authenticated)]
)
async def download_course_file(
    offering_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """
    Generate Course File PDF containing:
    1. Course Details (Subject, Faculty, Year)
    2. Syllabus & CO Definitions
    3. CO-PO Mapping Matrix
    4. Assessment Plan (Internals, Assignments)
    5. Final CO Attainment Summary
    """
    # 1. Fetch Data
    offering = db.query(SubjectOffering).options(
        joinedload(SubjectOffering.subject),
        joinedload(SubjectOffering.program),
        joinedload(SubjectOffering.cohort)
    ).get(offering_id)
    
    if not offering:
        raise HTTPException(status_code=404, detail="Offering not found")
        
    # Check permissions (Teacher assigned or HOD/Principal)
    # TODO: Refine RBAC if needed
    
    # Fetch COs
    cos = db.query(CourseOutcome).filter(
        CourseOutcome.subject_id == offering.subject_id
    ).order_by(CourseOutcome.co_code).all()
    
    # Fetch CO-PO Mappings
    mappings = db.query(COPOMapping).filter(
        COPOMapping.subject_id == offering.subject_id
    ).all()
    mapping_dict = {(m.co_id, m.po_id): m.strength for m in mappings}
    
    # Fetch POs
    pos = db.query(ProgramOutcome).filter(
        ProgramOutcome.program_id == offering.program_id
    ).order_by(ProgramOutcome.code).all()
    
    # 2. logical PDF Generation
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    story = []
    styles = getSampleStyleSheet()
    
    # Title
    story.append(Paragraph(f"Course File: {offering.subject.name} ({offering.subject.code})", styles['Title']))
    story.append(Spacer(1, 12))
    
    # Meta Info
    meta_data = [
        ["Program", offering.program.name],
        ["Batch", f"{offering.cohort.name} ({offering.cohort.academic_batch})"],
        ["Semester", str(offering.semester_no)],
        ["Faculty", current_user.full_name], # Note: Should really be the assigned teacher
    ]
    t = Table(meta_data, colWidths=[2*inch, 4*inch])
    t.setStyle(TableStyle([
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
        ('BACKGROUND', (0,0), (0,-1), colors.lightgrey),
    ]))
    story.append(t)
    story.append(Spacer(1, 24))
    
    # Course Outcomes
    story.append(Paragraph("1. Course Outcomes (COs)", styles['Heading2']))
    co_data = [["Code", "Description", "Bloom's Level"]]
    for co in cos:
        co_data.append([co.co_code, co.description, co.bloom_level or "N/A"])
        
    t_co = Table(co_data, colWidths=[1*inch, 4*inch, 1.5*inch])
    t_co.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.black),
        ('BACKGROUND', (0,0), (-1,0), colors.lightgrey),
        ('ALIGN', (0,1), (0,-1), 'CENTER'),
    ]))
    story.append(t_co)
    story.append(Spacer(1, 24))
    
    # CO-PO Matrix
    story.append(Paragraph("2. CO-PO Mapping Matrix", styles['Heading2']))
    
    # Header Row
    po_codes = [po.code for po in pos]
    matrix_header = ["CO"] + po_codes
    matrix_data = [matrix_header]
    
    for co in cos:
        row = [co.co_code]
        for po in pos:
            strength = mapping_dict.get((co.id, po.id), "-")
            row.append(str(strength) if strength else "-")
        matrix_data.append(row)
        
    # Calculate column widths dynamically
    col_w = [0.8*inch] + [0.4*inch] * len(pos)
    t_matrix = Table(matrix_data, colWidths=col_w)
    t_matrix.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.black),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(t_matrix)
    story.append(Spacer(1, 24))
    
    # Attainment Summary (Placeholder logic for now)
    story.append(Paragraph("3. CO Attainment Summary", styles['Heading2']))
    story.append(Paragraph("Attainment data would be populated here based on final calculations.", styles['Normal']))
    
    
    # Build
    doc.build(story, onFirstPage=create_header, onLaterPages=create_header)
    buffer.seek(0)
    
    filename = f"CourseFile_{offering.subject.code}_{offering.cohort.academic_batch}.pdf"
    return StreamingResponse(
        buffer, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get(
    "/attainment-summary",
    summary="Export Attainment Data (Excel)",
    description="Bulk export of CO/PO attainment for analysis. RBAC: HOD/PRINCIPAL.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_HOD))]
)
async def export_attainment_summary(
    batch_year: int = Query(..., description="Batch admission year"),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """
    Generate Excel with:
    Sheet 1: Subject-wise CO Attainment
    Sheet 2: Batch-wise PO Attainment
    """
    wb = Workbook()
    ws_co = wb.active
    ws_co.title = "CO Attainment"
    
    # Headers
    ws_co.append(["Subject Code", "Subject Name", "CO Code", "Target Level", "Attainment Level", "Status"])
    
    # TODO: Fetch actual data from role_scoped / analytics services
    # For now, creating a template structure
    
    # Example Dummy Data
    ws_co.append(["CS101", "Data Structures", "CO1", "2.5", "2.6", "Y"])
    ws_co.append(["CS101", "Data Structures", "CO2", "2.5", "2.2", "N"])
    
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=Attainment_Summary_{batch_year}.xlsx"}
    )
