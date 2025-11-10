"""
Configuration management for the chatbot backend
"""
from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # Gemini API
    GEMINI_API_KEY: str
    GEMINI_MODEL_PRO: str = "gemini-2.0-flash-exp"
    GEMINI_MODEL_FLASH: str = "gemini-2.0-flash-exp"
    
    # Database
    DATABASE_URL: str
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    CORS_ORIGINS: str = "http://localhost:5174,http://localhost:3010,http://localhost:3011"
    
    # File Upload
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 10485760  # 10MB
    ALLOWED_EXTENSIONS: str = ".png,.jpg,.jpeg,.pdf"
    
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Intent Classification
    INTENT_MODEL: str = "facebook/bart-large-mnli"
    INTENT_THRESHOLD: float = 0.7
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "./logs/chatbot.log"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    @property
    def allowed_extensions_list(self) -> List[str]:
        return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",")]


# Create settings instance
settings = Settings()

# Create necessary directories
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.dirname(settings.LOG_FILE), exist_ok=True)
