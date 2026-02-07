"""
EduMetrics Backend - Input Sanitization

Utilities for sanitizing user input to prevent XSS and injection attacks.
"""
import re
from typing import Optional

import bleach


# Allowed HTML tags for rich text fields (minimal set)
ALLOWED_TAGS = ['b', 'i', 'u', 'strong', 'em', 'p', 'br', 'ul', 'ol', 'li']
ALLOWED_ATTRIBUTES = {}


def sanitize_html(text: Optional[str]) -> Optional[str]:
    """
    Sanitize HTML content, keeping only allowed tags.
    
    Args:
        text: Input HTML string
        
    Returns:
        Sanitized HTML string
    """
    if text is None:
        return None
    
    return bleach.clean(
        text,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        strip=True
    )


def sanitize_text(text: Optional[str]) -> Optional[str]:
    """
    Sanitize text by removing all HTML tags.
    
    Args:
        text: Input string
        
    Returns:
        Plain text string with all HTML removed
    """
    if text is None:
        return None
    
    return bleach.clean(text, tags=[], strip=True)


def sanitize_reason(reason: Optional[str]) -> Optional[str]:
    """
    Sanitize reason/notes fields.
    
    These are stored in audit logs and displayed in admin interfaces.
    Remove any HTML and limit length.
    
    Args:
        reason: Reason or notes text
        
    Returns:
        Sanitized text
    """
    if reason is None:
        return None
    
    # Remove HTML
    clean = bleach.clean(reason, tags=[], strip=True)
    
    # Limit length
    max_length = 1000
    if len(clean) > max_length:
        clean = clean[:max_length] + "..."
    
    return clean


def sanitize_usn(usn: Optional[str]) -> Optional[str]:
    """
    Sanitize and validate USN format.
    
    USN format: [0-9][A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{3}
    Example: 1MS21CS001
    
    Args:
        usn: Student USN
        
    Returns:
        Uppercase sanitized USN or None if invalid
    """
    if usn is None:
        return None
    
    # Remove whitespace and convert to uppercase
    clean = usn.strip().upper()
    
    # Validate format (relaxed pattern)
    pattern = r'^[0-9][A-Z]{2}[0-9]{2}[A-Z]{2,3}[0-9]{3}$'
    if not re.match(pattern, clean):
        return None
    
    return clean


def sanitize_email(email: Optional[str]) -> Optional[str]:
    """
    Sanitize email address.
    
    Args:
        email: Email address
        
    Returns:
        Lowercase sanitized email
    """
    if email is None:
        return None
    
    # Remove whitespace and convert to lowercase
    clean = email.strip().lower()
    
    # Basic email validation
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, clean):
        return None
    
    return clean


def sanitize_query_param(param: Optional[str]) -> Optional[str]:
    """
    Sanitize query parameters to prevent SQL injection.
    
    Args:
        param: Query parameter value
        
    Returns:
        Sanitized parameter
    """
    if param is None:
        return None
    
    # Remove potentially dangerous characters
    dangerous = [';', '--', '/*', '*/', 'DROP', 'DELETE', 'INSERT', 'UPDATE', 'EXEC']
    clean = param
    
    for char in dangerous:
        clean = clean.replace(char, '')
    
    return clean.strip()


class InputSanitizer:
    """
    Utility class for input sanitization with validation.
    """
    
    @staticmethod
    def sanitize_dict(data: dict, fields_config: dict) -> dict:
        """
        Sanitize multiple fields in a dictionary.
        
        Args:
            data: Input dictionary
            fields_config: Dict mapping field names to sanitization functions
                          e.g., {"reason": "text", "email": "email", "notes": "html"}
        
        Returns:
            Dictionary with sanitized values
        """
        result = data.copy()
        
        sanitizers = {
            "text": sanitize_text,
            "html": sanitize_html,
            "reason": sanitize_reason,
            "email": sanitize_email,
            "usn": sanitize_usn,
            "query": sanitize_query_param
        }
        
        for field, sanitize_type in fields_config.items():
            if field in result and result[field] is not None:
                sanitizer = sanitizers.get(sanitize_type, sanitize_text)
                result[field] = sanitizer(result[field])
        
        return result
