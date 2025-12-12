"""
EduMetrics Backend - Base Repository
Generic CRUD operations for all models
"""
from typing import Generic, TypeVar, Type, Optional, List, Any
from sqlalchemy.orm import Session
from sqlalchemy import asc, desc
from uuid import UUID

from app.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Base repository with common CRUD operations."""
    
    def __init__(self, model: Type[ModelType]):
        self.model = model
    
    def get(self, db: Session, id: UUID) -> Optional[ModelType]:
        """Get a single record by ID."""
        return db.query(self.model).filter(self.model.id == id).first()
    
    def get_by_field(self, db: Session, field: str, value: Any) -> Optional[ModelType]:
        """Get a single record by any field."""
        return db.query(self.model).filter(getattr(self.model, field) == value).first()
    
    def get_all(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        order_by: str = None,
        order_desc: bool = False
    ) -> List[ModelType]:
        """Get all records with pagination."""
        query = db.query(self.model)
        
        if order_by and hasattr(self.model, order_by):
            order_col = getattr(self.model, order_by)
            query = query.order_by(desc(order_col) if order_desc else asc(order_col))
        
        return query.offset(skip).limit(limit).all()
    
    def count(self, db: Session) -> int:
        """Count all records."""
        return db.query(self.model).count()
    
    def create(self, db: Session, obj_in: dict) -> ModelType:
        """Create a new record."""
        db_obj = self.model(**obj_in)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update(self, db: Session, id: UUID, obj_in: dict) -> Optional[ModelType]:
        """Update an existing record."""
        db_obj = self.get(db, id)
        if not db_obj:
            return None
        
        for field, value in obj_in.items():
            if hasattr(db_obj, field) and value is not None:
                setattr(db_obj, field, value)
        
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def delete(self, db: Session, id: UUID) -> bool:
        """Delete a record."""
        db_obj = self.get(db, id)
        if not db_obj:
            return False
        
        db.delete(db_obj)
        db.commit()
        return True
    
    def filter_by(self, db: Session, **kwargs) -> List[ModelType]:
        """Filter records by multiple fields."""
        query = db.query(self.model)
        for field, value in kwargs.items():
            if hasattr(self.model, field) and value is not None:
                query = query.filter(getattr(self.model, field) == value)
        return query.all()
