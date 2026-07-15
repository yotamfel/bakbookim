from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str

    anthropic_api_key: str
    openai_api_key: str

    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24 * 7

    ip_hash_salt: str

    cors_origins: str = "http://localhost:5173"

    # Rate limiting: max requests per IP per hour
    rate_limit_per_hour: int = 20

    # Public list size (section 9 of spec — config, not hardcoded)
    list_top_n: int = 50

    # Clustering: cosine similarity threshold to join an existing cluster
    cluster_similarity_threshold: float = 0.86

    embedding_model: str = "text-embedding-3-large"
    normalization_model: str = "claude-sonnet-5"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
