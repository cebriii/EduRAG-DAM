from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/.env  (parents[0]=core, [1]=app, [2]=backend)
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    gemini_api_key: str = Field(..., alias="GEMINI_API_KEY")
    corpus_id: str = Field("identificador_de_tu_corpus", alias="CORPUS_ID")
    app_port: int = Field(8000, alias="APP_PORT")
    app_host: str = Field("0.0.0.0", alias="APP_HOST")
    log_level: str = Field("info", alias="LOG_LEVEL")


settings = Settings()
