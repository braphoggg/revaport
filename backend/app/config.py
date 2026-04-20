from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="PORT_", env_file=".env", extra="ignore")

    db_path: Path = Path(__file__).resolve().parent.parent / "data" / "portfolio.db"
    api_host: str = "127.0.0.1"
    api_port: int = 8000

    price_cache_ttl_market_seconds: int = 60
    price_cache_ttl_closed_seconds: int = 900
    scheduler_tick_market_seconds: int = 60
    scheduler_tick_closed_seconds: int = 900

    yfinance_max_retries: int = 3
    yfinance_min_gap_ms: int = 500

    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]


settings = Settings()
