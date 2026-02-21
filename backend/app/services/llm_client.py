"""
Groq LLM client wrapper for SocraticCanvas.
Provides synchronous and streaming inference using the Groq SDK.
"""

import asyncio
import logging
from typing import AsyncGenerator

from groq import Groq, AsyncGroq

from app.config import get_settings

logger = logging.getLogger(__name__)


class LLMClient:
    """Wrapper around the Groq API for LLM inference."""

    def __init__(self):
        settings = get_settings()
        self.model = settings.llm_model_name
        self.max_tokens = settings.max_tokens
        self.temperature = settings.temperature
        self._sync_client = Groq(api_key=settings.groq_api_key)
        self._async_client = AsyncGroq(api_key=settings.groq_api_key)

    def generate(
        self,
        system_prompt: str,
        messages: list[dict[str, str]],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        """Generate a completion synchronously."""
        full_messages = [{"role": "system", "content": system_prompt}] + messages
        try:
            response = self._sync_client.chat.completions.create(
                model=self.model,
                messages=full_messages,
                temperature=temperature or self.temperature,
                max_tokens=max_tokens or self.max_tokens,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"LLM generation error: {e}")
            raise

    async def agenerate(
        self,
        system_prompt: str,
        messages: list[dict[str, str]],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        """Generate a completion asynchronously."""
        full_messages = [{"role": "system", "content": system_prompt}] + messages
        try:
            response = await self._async_client.chat.completions.create(
                model=self.model,
                messages=full_messages,
                temperature=temperature or self.temperature,
                max_tokens=max_tokens or self.max_tokens,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"LLM async generation error: {e}")
            raise

    async def agenerate_stream(
        self,
        system_prompt: str,
        messages: list[dict[str, str]],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream a completion token by token asynchronously."""
        full_messages = [{"role": "system", "content": system_prompt}] + messages
        try:
            stream = await self._async_client.chat.completions.create(
                model=self.model,
                messages=full_messages,
                temperature=temperature or self.temperature,
                max_tokens=max_tokens or self.max_tokens,
                stream=True,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    yield delta.content
        except Exception as e:
            logger.error(f"LLM stream error: {e}")
            raise


# Singleton instance
_client: LLMClient | None = None


def get_llm_client() -> LLMClient:
    """Get or create the singleton LLM client."""
    global _client
    if _client is None:
        _client = LLMClient()
    return _client
