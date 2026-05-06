from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    vllm_base_url: str = "http://localhost:8000/v1"
    vllm_api_key: str = "not-needed"
    vllm_model: str = "Qwen/Qwen2.5-72B-Instruct"
    vllm_vision_model: str = "Qwen/Qwen2-VL-7B-Instruct"
    app_env: str = "development"
    debug: bool = True
    demo_mode: bool = True
    storage_path: str = "./data"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @field_validator("debug", mode="before")
    @classmethod
    def coerce_debug(cls, value):
        if isinstance(value, bool):
            return value
        if value is None:
            return True
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on", "debug", "development"}:
                return True
            if normalized in {"0", "false", "no", "off", "release", "prod", "production"}:
                return False
        return bool(value)


@lru_cache()
def get_settings() -> Settings:
    return Settings()
