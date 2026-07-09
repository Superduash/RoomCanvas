import json
import logging
from google import genai
from google.genai import types
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

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
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model_name = "gemini-2.5-flash"

    @retry(
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(Exception), # Could be more specific based on SDK
        reraise=True
    )
    async def analyze_room(self, image_bytes: bytes, mime_type: str, style_hint: str) -> dict:
        try:
            # We don't have async client natively in google.genai unless we use asyncio.to_thread or async client if available
            # We'll use synchronous call wrapped or if genai has async, use it. The google-genai package uses synchronous calls mostly.
            import asyncio
            
            prompt = get_analysis_prompt(style_hint)
            
            # Format the image for Gemini
            image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
            
            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ANALYSIS_RESPONSE_SCHEMA,
                temperature=0.2,
            )

            # Run in a thread to avoid blocking the event loop
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
            logger.error(f"Gemini analysis failed: {e}")
            raise AnalysisServiceError(f"Analysis failed: {str(e)}", 500)
