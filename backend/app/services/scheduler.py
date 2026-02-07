"""
EduMetrics Backend - Scheduler Service

APScheduler-based job scheduler for:
- Auto-locking exams past deadline
- Deadline reminders
- Cache cleanup
"""
import logging
from datetime import datetime, timedelta
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal


logger = logging.getLogger(__name__)

# Global scheduler instance
_scheduler: Optional[AsyncIOScheduler] = None


async def start_scheduler():
    """Initialize and start the scheduler."""
    global _scheduler
    
    if _scheduler is not None:
        return
    
    _scheduler = AsyncIOScheduler()
    
    # Add jobs
    _scheduler.add_job(
        auto_lock_past_deadline_exams,
        CronTrigger(hour=0, minute=0),  # Run daily at midnight
        id="auto_lock_exams",
        replace_existing=True
    )
    
    _scheduler.add_job(
        send_deadline_reminders,
        CronTrigger(hour=8, minute=0),  # Run daily at 8 AM
        id="deadline_reminders",
        replace_existing=True
    )
    
    _scheduler.add_job(
        cleanup_expired_cache,
        IntervalTrigger(hours=6),  # Run every 6 hours
        id="cache_cleanup",
        replace_existing=True
    )
    
    _scheduler.start()
    logger.info("✅ Scheduler started with 3 jobs")


async def stop_scheduler():
    """Shutdown the scheduler."""
    global _scheduler
    
    if _scheduler:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("⏹️ Scheduler stopped")


async def auto_lock_past_deadline_exams():
    """
    Auto-lock exams that are past their deadline.
    
    Runs daily at midnight.
    Locks exams where:
    - status = 'approved'
    - deadline + AUTO_LOCK_DEADLINE_HOURS has passed
    """
    logger.info("🔒 Running auto-lock job for past deadline exams...")
    
    db: Session = SessionLocal()
    try:
        from app.models import Exam, AuditLog
        
        cutoff = datetime.utcnow() - timedelta(hours=settings.AUTO_LOCK_DEADLINE_HOURS)
        
        # Find approved exams past deadline
        exams_to_lock = db.query(Exam).filter(
            Exam.status == "approved",
            Exam.deadline.isnot(None),
            Exam.deadline < cutoff
        ).all()
        
        locked_count = 0
        for exam in exams_to_lock:
            exam.status = "locked"
            exam.locked_at = datetime.utcnow()
            
            # Create audit entry
            audit = AuditLog(
                user_id=None,  # System action
                user_role="SYSTEM",
                action="AUTO_LOCK",
                entity_type="exam",
                entity_id=str(exam.id),
                old_value="approved",
                new_value="locked",
                reason=f"Auto-locked: deadline passed ({settings.AUTO_LOCK_DEADLINE_HOURS}h grace period)"
            )
            db.add(audit)
            locked_count += 1
        
        db.commit()
        logger.info(f"🔒 Auto-locked {locked_count} exams")
        
    except Exception as e:
        logger.error(f"❌ Auto-lock job failed: {e}")
        db.rollback()
    finally:
        db.close()


async def send_deadline_reminders():
    """
    Send deadline reminders to teachers.
    
    Runs daily at 8 AM.
    Sends reminders for exams where:
    - status = 'approved'
    - deadline is within 48 hours
    """
    logger.info("📧 Running deadline reminder job...")
    
    db: Session = SessionLocal()
    try:
        from app.models import Exam, Profile, TeacherAssignment
        from app.services.notifications import send_deadline_reminder_email
        
        # Find exams with deadline in next 48 hours
        now = datetime.utcnow()
        reminder_window = now + timedelta(hours=48)
        
        exams = db.query(Exam).filter(
            Exam.status == "approved",
            Exam.deadline.isnot(None),
            Exam.deadline > now,
            Exam.deadline <= reminder_window
        ).all()
        
        sent_count = 0
        for exam in exams:
            # Get assigned teacher
            assignment = db.query(TeacherAssignment).filter(
                TeacherAssignment.offering_id == exam.offering_id
            ).first()
            
            if assignment and assignment.teacher:
                hours_remaining = int((exam.deadline - now).total_seconds() / 3600)
                await send_deadline_reminder_email(
                    teacher=assignment.teacher,
                    exam=exam,
                    hours_remaining=hours_remaining
                )
                sent_count += 1
        
        logger.info(f"📧 Sent {sent_count} deadline reminders")
        
    except Exception as e:
        logger.error(f"❌ Deadline reminder job failed: {e}")
    finally:
        db.close()


async def cleanup_expired_cache():
    """
    Cleanup expired cache entries.
    
    Runs every 6 hours.
    Redis handles TTL automatically, this is for any cleanup tasks.
    """
    logger.info("🧹 Running cache cleanup job...")
    
    try:
        from app.core.cache import get_redis
        
        redis_client = await get_redis()
        if redis_client:
            # Get memory stats
            info = await redis_client.info("memory")
            used_mb = info.get("used_memory_human", "unknown")
            logger.info(f"📊 Redis memory usage: {used_mb}")
        
    except Exception as e:
        logger.error(f"❌ Cache cleanup job failed: {e}")
