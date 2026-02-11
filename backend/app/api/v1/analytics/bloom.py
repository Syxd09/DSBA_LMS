from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.api.deps import get_current_user
from app.models import Profile, UserRole
from app.services.analytics import bloom_service
from app.services.analytics.schemas import AnalyticsResponse, BloomAnalysisDTO

router = APIRouter(prefix="/bloom-analysis", tags=["Analytics - Bloom"])

@router.get("/{offering_id}", response_model=AnalyticsResponse)
async def get_term_bloom_analysis(
    offering_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    """
    Get Bloom's Taxonomy distribution analysis for an offering.
    
    Analyses all exams (INT1, INT2, EXT) associated with the offering.
    Returns:
    - Target Distribution (Max Marks)
    - Actual Performance (Obtained Marks)
    - Weakest cognitive levels
    
    Access: Faculty (of offering), HOD (of dept), Principal
    """
    # TODO: Add strict RBAC (Offering-Level)
    # For now, allowing all authorized users for development velocity
    # Production usage must enforce offering ownership check
    
    service = bloom_service.BloomAnalysisService(db)
    return await service.analyze_offering_bloom(offering_id)
