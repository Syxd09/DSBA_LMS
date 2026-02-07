"""
EduMetrics Backend - Configuration Settings
"""
from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "EduMetrics API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/edumetrics"
    
    # Security
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:8080"
    
    # Production Settings
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    
    # Rate Limiting
    RATE_LIMIT_ANALYTICS: int = 30  # requests per minute
    RATE_LIMIT_EXPORT: int = 10     # requests per minute
    RATE_LIMIT_DEFAULT: int = 60    # requests per minute
    
    # Pagination
    MAX_PAGE_SIZE: int = 100
    DEFAULT_PAGE_SIZE: int = 50
    
    # Query Timeouts (seconds)
    QUERY_TIMEOUT_DEFAULT: int = 30
    QUERY_TIMEOUT_ANALYTICS: int = 60
    QUERY_TIMEOUT_EXPORT: int = 120
    
    # Feature Flags (reserved for future phases)
    ENABLE_RBAC: bool = True  # ENABLED for security
    ENABLE_DASHBOARD: bool = True  # ENABLED
    
    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379/0"
    RATE_LIMITER_BACKEND: str = "redis"  # redis or memory
    CACHE_TTL_ANALYTICS: int = 300  # 5 minutes
    CACHE_TTL_CO_ATTAINMENT: int = 300
    
    # CSRF Protection
    CSRF_SECRET: str = "csrf-secret-key-change-in-production"
    CSRF_COOKIE_SECURE: bool = False  # Set True in production (HTTPS)
    
    # Email Configuration (FastAPI-Mail)
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "noreply@edumetrics.local"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False
    
    # Scheduler
    ENABLE_SCHEDULER: bool = True
    AUTO_LOCK_DEADLINE_HOURS: int = 24  # Lock exams 24h after deadline
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()

