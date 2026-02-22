from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    groq_api_key: str = ""
    llm_model_name: str = "llama-3.3-70b-versatile"
    max_tokens: int = 1024
    temperature: float = 0.7

    # JWT Auth
    jwt_secret_key: str = "change-me-in-production-super-secret-key-2024"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24 hours

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: list[str] = ["*"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
