"""
Application configuration using Pydantic Settings
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Database
    database_url: str = "sqlite:///./qcloud.db"

    # JWT Authentication
    secret_key: str = "development-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_hours: int = 24

    # IBMQ
    ibmq_token: str = ""
    ibmq_instance: str = "ibm-q/open/main"
    ibmq_channel: str = "ibm_cloud"  # "ibm_cloud" or "ibm_quantum"
    ibmq_backend: str = "ibm_torino"  # default backend

    # CORS
    frontend_url: str = "http://localhost:3000"

    # App info
    app_name: str = "QCloud Backend"
    app_version: str = "1.0.0"
    debug: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()
