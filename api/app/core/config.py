import os


def get_env(name: str, default: str) -> str:
    value = os.getenv(name)
    return value if value else default


DATABASE_URL = get_env("DATABASE_URL", "postgresql+asyncpg://english:english@localhost:5432/english_web")
REDIS_URL = get_env("REDIS_URL", "redis://localhost:6379/0")
JWT_SECRET = get_env("JWT_SECRET", "change-me")
JWT_ALGORITHM = get_env("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(get_env("JWT_EXPIRE_MINUTES", "1440"))
