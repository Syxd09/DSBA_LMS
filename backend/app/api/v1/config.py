from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db
from app.api.deps import require_authenticated, require_principal
from app.models.config import SystemSetting
from app.schemas.config import SystemSettingResponse, SystemSettingUpdate

router = APIRouter(prefix="/config", tags=["Configuration"])

@router.get("/system", response_model=List[SystemSettingResponse])
async def list_system_settings(
    db: Session = Depends(get_db),
    current_user = Depends(require_authenticated)
):
    """List all global system settings."""
    return db.query(SystemSetting).all()

@router.get("/system/{key}", response_model=SystemSettingResponse)
async def get_system_setting(
    key: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_authenticated)
):
    """Get a specific system setting."""
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting {key} not found")
    return setting

@router.patch("/system/{key}", response_model=SystemSettingResponse)
async def update_system_setting(
    key: str,
    setting_in: SystemSettingUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_principal)
):
    """Update a specific system setting. Restricted to Principal."""
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not setting:
        # Create on-the-fly if it doesn't exist for flexibility
        setting = SystemSetting(key=key, value=setting_in.value)
        db.add(setting)
    else:
        setting.value = setting_in.value
    
    db.commit()
    db.refresh(setting)
    return setting
