from datetime import date, datetime
from functools import lru_cache
from zoneinfo import ZoneInfo

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-5-5"
    app_timezone: str = "America/Mexico_City"
    frontend_origin: str = "http://localhost:5173"

    kcal_target: float = 2200
    protein_target_g: float = 150
    carbs_target_g: float = 220
    fat_target_g: float = 70

    @field_validator("database_url")
    @classmethod
    def use_psycopg_driver(cls, v: str) -> str:
        # Railway entrega postgresql:// (o postgres://); SQLAlchemy necesita el driver explícito.
        for prefix in ("postgresql://", "postgres://"):
            if v.startswith(prefix):
                return "postgresql+psycopg://" + v[len(prefix):]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()


def today_local() -> date:
    """Fecha de hoy en APP_TIMEZONE (no en UTC)."""
    return datetime.now(ZoneInfo(get_settings().app_timezone)).date()
