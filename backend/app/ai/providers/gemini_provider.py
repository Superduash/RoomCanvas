import json
import logging
from google import genai
from google.genai import types
import socket
from google.genai import errors as genai_errors

from app.config import settings
from app.ai.providers.base_provider import AnalysisProvider
from app.utils.exceptions import AnalysisServiceError
from app.ai.prompts.schemas import ANALYSIS_RESPONSE_SCHEMA
from app.ai.prompt_builder import get_analysis_prompt

logger = logging.getLogger(__name__)

class GeminiProvider(AnalysisProvider):
    def __init__(self):
        if not settings.GEMINI_API_KEY:
            raise AnalysisServiceError("GEMINI_API_KEY is not configured", 500)
        self.client = genai.Client(
            api_key=settings.GEMINI_API_KEY,
            http_options=types.HttpOptions(timeout=settings.GEMINI_TIMEOUT_SECONDS * 1000),
        )
        self.model_name = "gemini-2.5-flash"

    @staticmethod
    def _is_transient(exc: Exception) -> bool:
        if isinstance(exc, (socket.gaierror, TimeoutError, ConnectionError)):
            return True
        exc_str = str(exc).lower()
        if "timed out" in exc_str or "timeout" in exc_str or "503" in exc_str or "unavailable" in exc_str:
            return True
        if isinstance(exc, genai_errors.APIError): # using APIError as genai_errors base
            if hasattr(exc, 'code') and exc.code >= 500:
                return True
        return False

    async def analyze_room(self, image_bytes: bytes, mime_type: str, style_hint: str) -> dict:
        import asyncio
        prompt = get_analysis_prompt(style_hint)
        image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ANALYSIS_RESPONSE_SCHEMA,
            temperature=0.2,
        )

        models = [
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-2.0-flash"
        ]

        last_exc = None
        for model in models:
            self.model_name = model
            for attempt in range(1, 4):
                try:
                    response = await asyncio.to_thread(
                        self.client.models.generate_content,
                        model=self.model_name,
                        contents=[image_part, prompt],
                        config=config,
                    )
                    if not response.text:
                        raise AnalysisServiceError("Empty response from Gemini", 500)
                    return json.loads(response.text)
                except Exception as e:
                    last_exc = e
                    if GeminiProvider._is_transient(e):
                        if attempt < 3:
                            wait_time = 2 ** attempt
                            logger.warning(f"{model} failed on attempt {attempt}. Retrying in {wait_time}s... Error: {e}")
                            await asyncio.sleep(wait_time)
                            continue
                        else:
                            logger.error(f"{model} failed after 3 attempts. Falling back to next model.")
                            break # Move to next model
                    else:
                        # Not a transient error, maybe auth or bad request — bubble up immediately
                        logger.error(f"Gemini analysis hard failed on {model}: {e}")
                        raise AnalysisServiceError(f"Analysis failed: {str(e)}", 500)
                        
        raise AnalysisServiceError(f"All Gemini models failed. Last error: {str(last_exc)}", 500)
