"""
EduMetrics Backend - Email Notifications Service

FastAPI-Mail based notification system for:
- Marks approval notifications
- Deadline reminders
- Workflow alerts
"""
import logging
from typing import List, Optional
from pathlib import Path

from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr

from app.config import settings


logger = logging.getLogger(__name__)


# Email configuration
conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=bool(settings.MAIL_USERNAME),
    VALIDATE_CERTS=True
)

# FastMail instance (lazy initialization)
_mail: Optional[FastMail] = None


def _get_mail() -> Optional[FastMail]:
    """Get FastMail instance with lazy initialization."""
    global _mail
    if _mail is None and settings.MAIL_USERNAME:
        _mail = FastMail(conf)
    return _mail


async def send_email(
    recipients: List[str],
    subject: str,
    body: str,
    html: bool = True
) -> bool:
    """
    Send email to recipients.
    
    Args:
        recipients: List of email addresses
        subject: Email subject
        body: Email body (HTML or plain text)
        html: Whether body is HTML
        
    Returns:
        True if sent successfully, False otherwise
    """
    mail = _get_mail()
    if not mail:
        logger.warning("Email not configured, skipping notification")
        return False
    
    try:
        message = MessageSchema(
            subject=subject,
            recipients=recipients,
            body=body,
            subtype=MessageType.html if html else MessageType.plain
        )
        
        await mail.send_message(message)
        logger.info(f"📧 Email sent to {recipients}: {subject}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to send email: {e}")
        return False


async def send_marks_approved_notification(
    teacher_email: str,
    teacher_name: str,
    exam_name: str,
    subject_name: str,
    approver_name: str
) -> bool:
    """Notify teacher when their marks are approved."""
    subject = f"✅ Marks Approved: {subject_name}"
    
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #4F46E5; color: white; padding: 20px; text-align: center;">
            <h1>EduMetrics</h1>
        </div>
        <div style="padding: 20px;">
            <h2>Hi {teacher_name},</h2>
            <p>Your marks for the following exam have been approved:</p>
            <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Exam:</strong> {exam_name}</p>
                <p><strong>Subject:</strong> {subject_name}</p>
                <p><strong>Approved by:</strong> {approver_name}</p>
            </div>
            <p>The marks are now official and will be included in analytics.</p>
            <p style="color: #666; font-size: 12px;">
                This is an automated notification from EduMetrics.
            </p>
        </div>
    </body>
    </html>
    """
    
    return await send_email([teacher_email], subject, body)


async def send_marks_rejected_notification(
    teacher_email: str,
    teacher_name: str,
    exam_name: str,
    subject_name: str,
    rejector_name: str,
    reason: str
) -> bool:
    """Notify teacher when their marks are rejected."""
    subject = f"⚠️ Marks Rejected: {subject_name}"
    
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #DC2626; color: white; padding: 20px; text-align: center;">
            <h1>EduMetrics</h1>
        </div>
        <div style="padding: 20px;">
            <h2>Hi {teacher_name},</h2>
            <p>Your marks submission has been rejected and requires correction:</p>
            <div style="background: #FEF2F2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #DC2626;">
                <p><strong>Exam:</strong> {exam_name}</p>
                <p><strong>Subject:</strong> {subject_name}</p>
                <p><strong>Rejected by:</strong> {rejector_name}</p>
                <p><strong>Reason:</strong> {reason}</p>
            </div>
            <p>Please review and resubmit the marks.</p>
        </div>
    </body>
    </html>
    """
    
    return await send_email([teacher_email], subject, body)


async def send_deadline_reminder_email(
    teacher,  # Profile model
    exam,     # Exam model
    hours_remaining: int
) -> bool:
    """Send deadline reminder to teacher."""
    if not teacher.email:
        return False
    
    subject = f"⏰ Deadline Reminder: {hours_remaining}h remaining"
    
    urgency_color = "#DC2626" if hours_remaining <= 24 else "#F59E0B"
    
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: {urgency_color}; color: white; padding: 20px; text-align: center;">
            <h1>⏰ Deadline Reminder</h1>
        </div>
        <div style="padding: 20px;">
            <h2>Hi {teacher.full_name or teacher.email},</h2>
            <p>You have <strong>{hours_remaining} hours</strong> remaining to complete marks entry:</p>
            <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Exam:</strong> {exam.exam_type}</p>
                <p><strong>Deadline:</strong> {exam.deadline.strftime('%Y-%m-%d %H:%M') if exam.deadline else 'Not set'}</p>
            </div>
            <p>Please ensure all marks are entered and submitted before the deadline.</p>
        </div>
    </body>
    </html>
    """
    
    return await send_email([teacher.email], subject, body)


async def send_exam_submitted_notification(
    hod_email: str,
    hod_name: str,
    teacher_name: str,
    exam_name: str,
    subject_name: str
) -> bool:
    """Notify HOD when an exam is submitted for approval."""
    subject = f"📋 Pending Approval: {subject_name}"
    
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563EB; color: white; padding: 20px; text-align: center;">
            <h1>EduMetrics</h1>
        </div>
        <div style="padding: 20px;">
            <h2>Hi {hod_name},</h2>
            <p>An exam has been submitted for your approval:</p>
            <div style="background: #EFF6FF; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Exam:</strong> {exam_name}</p>
                <p><strong>Subject:</strong> {subject_name}</p>
                <p><strong>Submitted by:</strong> {teacher_name}</p>
            </div>
            <p>Please review and approve/reject as appropriate.</p>
        </div>
    </body>
    </html>
    """
    
    return await send_email([hod_email], subject, body)
