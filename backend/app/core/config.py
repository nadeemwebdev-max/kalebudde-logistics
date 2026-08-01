from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Kalebudde Logistics API"
    SITE_URL: str = "https://kalebuddelogistics.in"
    # Falls back to a local SQLite file so the app boots without Postgres.
    DATABASE_URL: str = "sqlite:///./kalebudde.db"
    SECRET_KEY: str = "change-me-in-production-please-use-a-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    SEED_ADMIN_EMAIL: str = "admin@kalebuddelogistics.in"
    SEED_ADMIN_PASSWORD: str = "Admin@12345"

    TELEGRAM_BOT_TOKEN: str | None = None
    TELEGRAM_CHAT_ID: str | None = None
    EWAY_EXPIRY_THRESHOLD_HOURS: int = 48

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
