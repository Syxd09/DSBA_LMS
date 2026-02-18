from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class SystemSettingBase(BaseModel):
    key: str
    value: str
    category: Optional[str] = "general"

class SystemSettingCreate(SystemSettingBase):
    pass

class SystemSettingUpdate(BaseModel):
    value: str

class SystemSettingResponse(SystemSettingBase):
    updated_at: datetime

    class Config:
        from_attributes = True
