from openai import OpenAI

from app.config import get_settings

settings = get_settings()
_client = OpenAI(api_key=settings.openai_api_key)


def embed_text(text: str) -> list[float]:
    response = _client.embeddings.create(model=settings.embedding_model, input=text)
    return response.data[0].embedding
