"""
EduMetrics Analytics Layer - CO Attainment Orchestration Service

Orchestrates Phase-2A computation functions for CO attainment APIs.

EXECUTION GUARD #1: API layer remains thin.
"""
from typing import List, Dict, Optional, Tuple
from uuid import UUID
from decimal import Decimal
from datetime import datetime

from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.services.analytics.query_helpers import (
    get_offering_enrolled_students,
    get_student_statuses,
    get_offering_exams,
    get_exam_by_type,
    get_exam_sections,
    get_co_sub_questions,
    get_all_student_marks_for_exam,
    get_offering_cos,
    get_attainment_config,
)
from app.services.analytics.schemas import (
    WarningDTO,
    PaginationDTO,
    AnalyticsResponse,
    AttainmentDTO,
    COAttainmentDTO,
    COSummaryDTO,
    COAttainmentListResponse,
    StudentCOEvidenceDTO,
    QuestionMarkDTO,
    COStudentEvidenceResponse,
)
from app.services.analytics.marks_service import _warning_to_dto
from app.services.computation import (
    get_valid_students_for_attainment,
    compute_co_max_marks,
    compute_co_attainment,
    compute_co_attainment_final,
    classify_attainment_static,
    WarningCode,
)



def _compute_offering_co_attainments_sync(
    db: Session,
    offering_id: UUID,
    program_id: Optional[UUID] = None,
    cohort_year: Optional[int] = None
) -> AnalyticsResponse:
    """Sync implementation of CO attainment computation."""
    
    all_warnings = []
    is_complete = True
    co_results = []
    
    # Get COs for offering
    cos = get_offering_cos(db, offering_id)
    if not cos:
        return AnalyticsResponse(
            data=COAttainmentListResponse(
                offering_id=offering_id,
                cos=[],
                summary=COSummaryDTO(
                    total_cos=0,
                    cos_attained=0,
                    average_attainment=Decimal("0")
                )
            ),
            warnings=[WarningDTO(
                code=WarningCode.NO_COS_DEFINED.value,
                message="No COs defined for this offering",
                affected=[str(offering_id)]
            )],
            is_complete=False,
            computed_at=datetime.utcnow()
        )
    
    # Get enrolled students and statuses
    enrolled_usns = get_offering_enrolled_students(db, offering_id)
    student_statuses = get_student_statuses(db, enrolled_usns)
    
    # Get internal and external exams
    int1_exam = get_exam_by_type(db, offering_id, "INT1")
    int2_exam = get_exam_by_type(db, offering_id, "INT2")
    ext_exam = get_exam_by_type(db, offering_id, "EXT")
    
    # Combine internal exams for CO computation
    internal_exam_ids = []
    if int1_exam:
        internal_exam_ids.append(int1_exam.id)
    if int2_exam:
        internal_exam_ids.append(int2_exam.id)
    
    # Get all marks
    int_marks: Dict = {}
    ext_marks: Dict = {}
    
    for exam_id in internal_exam_ids:
        marks = get_all_student_marks_for_exam(db, exam_id)
        int_marks.update(marks)
    
    if ext_exam:
        ext_marks = get_all_student_marks_for_exam(db, ext_exam.id)
    
    
    # [OPTIMIZATION] Bulk fetch sub-questions for all exams
    from app.services.analytics.query_helpers import get_all_sub_questions_for_exams
    
    all_exam_ids = internal_exam_ids + ([ext_exam.id] if ext_exam else [])
    
    all_sqs_map = get_all_sub_questions_for_exams(db, all_exam_ids)
    
    # Pre-fetch sections for all exams to avoid N+1
    exam_section_configs = {}
    for eid in all_exam_ids:
        sections = get_exam_sections(db, eid)
        exam_section_configs[eid] = {}
        for s in sections:
            exam_section_configs[eid][s.id] = {
                "selection_mode": s.selection_mode,
                "required_questions": s.required_questions
            }
    
    # Process each CO
    for co in cos:
        co_id = co["co_id"]
        threshold = co["threshold"]
        
        # Get SQs from memory map
        co_sqs_all = all_sqs_map.get(co_id, [])
        
        # Filter for internal
        int_sq_ids = []
        int_section_configs = {} # flattened for computation
        
        for sq in co_sqs_all:
            if sq.exam_id in internal_exam_ids:
                int_sq_ids.append(sq.id)
                # Add section config
                if sq.exam_id in exam_section_configs and sq.section_id in exam_section_configs[sq.exam_id]:
                     int_section_configs[sq.section_id] = exam_section_configs[sq.exam_id][sq.section_id]

        # Filter for external
        ext_sq_ids = []
        ext_section_configs = {}
        
        if ext_exam:
             for sq in co_sqs_all:
                if sq.exam_id == ext_exam.id:
                    ext_sq_ids.append(sq.id)
                    if sq.section_id in exam_section_configs.get(ext_exam.id, {}):
                        ext_section_configs[sq.section_id] = exam_section_configs[ext_exam.id][sq.section_id]
        
        # Get valid students (Phase-2A) for internal
        int_valid_usns, int_exclusions = get_valid_students_for_attainment(
            enrolled_usns=enrolled_usns,
            student_statuses=student_statuses,
            student_question_marks=int_marks,
            co_sub_question_ids=int_sq_ids
        )
        
        # Get valid students for external
        ext_valid_usns, ext_exclusions = get_valid_students_for_attainment(
            enrolled_usns=enrolled_usns,
            student_statuses=student_statuses,
            student_question_marks=ext_marks,
            co_sub_question_ids=ext_sq_ids
        )
        
        # Aggregate student marks per CO
        int_student_co_marks = {}
        for usn in int_valid_usns:
            total = Decimal("0")
            for sq_id in int_sq_ids:
                mark = int_marks.get((usn, sq_id))
                if mark:
                    total += mark
            int_student_co_marks[usn] = total
        
        ext_student_co_marks = {}
        for usn in ext_valid_usns:
            total = Decimal("0")
            for sq_id in ext_sq_ids:
                mark = ext_marks.get((usn, sq_id))
                if mark:
                    total += mark
            ext_student_co_marks[usn] = total
        
        # Compute CO attainment (Phase-2A)
        int_result = compute_co_attainment(
            co_id=co_id,
            co_threshold=threshold,
            exam_category="INTERNAL",
            valid_usns=int_valid_usns,
            student_marks=int_student_co_marks,
            max_marks=Decimal("40")  # Placeholder
        )
        
        ext_result = compute_co_attainment(
            co_id=co_id,
            co_threshold=threshold,
            exam_category="EXTERNAL",
            valid_usns=ext_valid_usns,
            student_marks=ext_student_co_marks,
            max_marks=Decimal("60")  # Placeholder
        )
        
        # Compute final (Phase-2A)
        final_result = compute_co_attainment_final(
            co_id=co_id,
            internal_result=int_result,
            external_result=ext_result
        )
        
        all_warnings.extend([_warning_to_dto(w) for w in final_result.warnings])
        
        co_results.append(COAttainmentDTO(
            co_id=co_id,
            co_code=co["co_code"],
            co_statement=co["co_statement"],
            internal_attainment=AttainmentDTO(
                percentage=int_result.attainment_percentage,
                level=int_result.attainment_level,
                appeared_students=int_result.appeared_students,
                passing_students=int_result.passing_students,
                threshold=threshold
            ),
            external_attainment=AttainmentDTO(
                percentage=ext_result.attainment_percentage,
                level=ext_result.attainment_level,
                appeared_students=ext_result.appeared_students,
                passing_students=ext_result.passing_students,
                threshold=threshold
            ),
            final_attainment=AttainmentDTO(
                percentage=final_result.final_attainment_percentage,
                level=final_result.final_attainment_level,
                appeared_students=max(int_result.appeared_students, ext_result.appeared_students),
                passing_students=0,  # Computed via weighted average
                threshold=threshold
            )
        ))
    
    # Summary
    cos_attained = sum(1 for c in co_results if c.final_attainment.level >= 1)
    avg_attainment = (
        sum(c.final_attainment.percentage for c in co_results) / len(co_results)
        if co_results else Decimal("0")
    )
    
    return AnalyticsResponse(
        data=COAttainmentListResponse(
            offering_id=offering_id,
            cos=co_results,
            summary=COSummaryDTO(
                total_cos=len(cos),
                cos_attained=cos_attained,
                average_attainment=avg_attainment
            )
        ),
        warnings=all_warnings,
        is_complete=is_complete,
        computed_at=datetime.utcnow()
    )


async def compute_offering_co_attainments(
    db: Session,
    offering_id: UUID,
    program_id: Optional[UUID] = None,
    cohort_year: Optional[int] = None
) -> AnalyticsResponse:
    """
    Compute all CO attainments for an offering (Wrapper).
    """
    from app.core.cache import cache_manager, settings
    
    cache_key = f"co_attainment:{offering_id}"
    
    # Try Cache
    cached_data = await cache_manager.get(cache_key)
    if cached_data:
        try:
            response_data = COAttainmentListResponse(**cached_data["data"])
            return AnalyticsResponse(
                data=response_data,
                warnings=[WarningDTO(**w) for w in cached_data.get("warnings", [])],
                is_complete=cached_data.get("is_complete", True),
                computed_at=datetime.fromisoformat(cached_data["computed_at"]) if cached_data.get("computed_at") else datetime.utcnow()
            )
        except Exception:
            pass

    # Run computation in thread pool (non-blocking)
    final_response = await run_in_threadpool(
        _compute_offering_co_attainments_sync,
        db,
        offering_id,
        program_id,
        cohort_year
    )
    
    # Store in Cache
    if final_response.is_complete:
        try:
            to_cache = {
                "data": final_response.data.model_dump(),
                "warnings": [w.model_dump() for w in final_response.warnings],
                "is_complete": final_response.is_complete,
                "computed_at": final_response.computed_at.isoformat()
            }
            await cache_manager.set(cache_key, to_cache, ttl=settings.CACHE_TTL_CO_ATTAINMENT)
        except Exception:
            pass
            
    return final_response



def _get_co_student_evidence_sync(
    db: Session,
    co_id: UUID,
    offering_id: UUID,
    usn: Optional[str] = None,
    page: int = 0,
    page_size: int = 50
) -> AnalyticsResponse:
    """Sync implementation of CO student evidence."""
    from app.services.analytics.query_helpers import paginate_usns
    
    all_warnings = []
    
    # Get students (single or paginated)
    if usn:
        usns = [usn]
        total = 1
    else:
        usns, total = paginate_usns(db, offering_id, page, page_size)
    
    # Get CO details
    cos = get_offering_cos(db, offering_id)
    co_data = next((c for c in cos if c["co_id"] == co_id), None)
    
    if not co_data:
        return AnalyticsResponse(
            data=None,
            warnings=[WarningDTO(
                code="CO_NOT_FOUND",
                message=f"CO {co_id} not found",
                affected=[str(co_id)]
            )],
            is_complete=False,
            computed_at=datetime.utcnow()
        )
    
    threshold = co_data["threshold"]
    
    # Get exams and marks
    ext_exam = get_exam_by_type(db, offering_id, "EXT")
    all_marks = {}
    if ext_exam:
        all_marks = get_all_student_marks_for_exam(db, ext_exam.id)
    
    # Get CO-mapped questions
    co_sqs = []
    if ext_exam:
        co_sqs = get_co_sub_questions(db, co_id, ext_exam.id)
    
    max_marks = sum(sq.max_marks for sq in co_sqs)
    
    students = []
    for usn_val in usns:
        obtained = Decimal("0")
        q_breakdown = []
        
        for sq in co_sqs:
            mark = all_marks.get((usn_val, sq.id), Decimal("0"))
            obtained += mark
            q_breakdown.append(QuestionMarkDTO(
                question_id=sq.question_id,
                question_number="Q",
                sub_question_id=sq.id,
                marks_obtained=mark,
                max_marks=sq.max_marks
            ))
        
        percentage = (obtained / max_marks * 100) if max_marks > 0 else Decimal("0")
        
        students.append(StudentCOEvidenceDTO(
            usn=usn_val,
            obtained_marks=obtained,
            max_marks=max_marks,
            percentage=percentage,
            meets_threshold=percentage >= threshold,
            question_breakdown=q_breakdown
        ))
    
    total_pages = (total + page_size - 1) // page_size
    
    return AnalyticsResponse(
        data=COStudentEvidenceResponse(
            co_id=co_id,
            co_code=co_data["co_code"],
            students=students,
            pagination=PaginationDTO(
                page=page,
                page_size=page_size,
                total_items=total,
                total_pages=total_pages,
                has_next=page < total_pages - 1,
                has_prev=page > 0
            )
        ),
        warnings=all_warnings,
        is_complete=True,
        computed_at=datetime.utcnow()
    )


async def get_co_student_evidence(
    db: Session,
    co_id: UUID,
    offering_id: UUID,
    usn: Optional[str] = None,
    page: int = 0,
    page_size: int = 50
) -> AnalyticsResponse:
    """
    Get student-level evidence for CO attainment (Wrapper).
    """
    return await run_in_threadpool(
        _get_co_student_evidence_sync,
        db,
        co_id,
        offering_id,
        usn,
        page,
        page_size
    )


# Import for uuid4 usage
from uuid import uuid4
