import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    DATABASE_URL: str = "sqlite:///./document_summarizer.db"
    UPLOAD_DIR: str = "./uploads"
    VECTOR_DB_DIR: str = "./vector_indices"
    
    # Optional OpenAI Key in case the user wants to use OpenAI
    OPENAI_API_KEY: str = ""
    
    # App Settings
    PROJECT_NAME: str = "Automated Document Summarizer"
    API_V1_STR: str = "/api/v1"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.VECTOR_DB_DIR, exist_ok=True)
