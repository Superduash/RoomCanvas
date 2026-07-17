import json
import logging
from google import genai
from google.genai import types
import socket
from google.genai import errors as genai_errors

from app.config import settings
from app.ai.providers.base_provider import AnalysisProvider, GenerationProvider
from app.utils.exceptions import AnalysisServiceError
from app.ai.prompts.schemas import ANALYSIS_RESPONSE_SCHEMA
from app.ai.prompt_builder import get_analysis_prompt

logger = logging.getLogger(__name__)

class GeminiProvider(AnalysisProvider, GenerationProvider):
    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        if not self.api_key:
            raise AnalysisServiceError("GEMINI_API_KEY is not configured and no user key provided.", 500)
        self.client = genai.Client(
            api_key=self.api_key,
            http_options=types.HttpOptions(timeout=settings.GEMINI_TIMEOUT_SECONDS * 1000),
        )
        self.model_name = model or settings.GEMINI_TEXT_MODEL_DEFAULT
        
    async def generate(self, image_bytes: bytes, mime_type: str, prompt: str, seed: int = None) -> tuple[str, int]:
        return await self._run_gemini_generation(image_bytes, mime_type, prompt, seed)
        
    async def refine(self, image_bytes: bytes, mime_type: str, instruction: str, seed: int = None) -> tuple[str, int]:
        return await self._run_gemini_generation(image_bytes, mime_type, instruction, seed)

    async def _run_gemini_generation(self, image_bytes: bytes, mime_type: str, prompt: str, seed: int = None) -> tuple[str, int]:
        import asyncio
        import random
        import base64
        
        if seed is None:
            seed = random.randint(0, 2**32 - 1)
            
        image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        
        last_exc = None
        for attempt in range(1, 4):
            try:
                response = await asyncio.to_thread(
                    self.client.models.generate_content,
                    model=self.model_name,
                    contents=[image_part, prompt],
                )
                
                # Extract image bytes or URL
                img_data = None
                img_mime = "image/jpeg"
                if hasattr(response, 'candidates') and response.candidates:
                    for part in response.candidates[0].content.parts:
                        if hasattr(part, 'inline_data') and part.inline_data:
                            img_data = part.inline_data.data
                            img_mime = part.inline_data.mime_type
                            break
                        
                if img_data:
                    b64_img = base64.b64encode(img_data).decode('utf-8')
                    return (f"data:{img_mime};base64,{b64_img}", seed)
                else:
                    if response.text and response.text.startswith('http'):
                        return (response.text.strip(), seed)
                    raise AnalysisServiceError("No image returned from Gemini", 500)
                    
            except Exception as e:
                last_exc = e
                if GeminiProvider._is_transient(e):
                    if attempt < 3:
                        wait_time = 2 ** attempt
                        logger.warning(f"Gemini {self.model_name} failed on attempt {attempt}. Retrying in {wait_time}s... Error: {e}")
                        await asyncio.sleep(wait_time)
                        continue
                    else:
                        logger.error(f"Gemini {self.model_name} failed after 3 attempts with transient error: {e}")
                        # Fall through to the error handler below so we don't swallow the real error
                
                # If we get here, it's either a non-transient error, or we exhausted our 3 retries
                err_msg = str(e)
                status_code = 500
                if isinstance(e, genai_errors.APIError):
                    err_msg = f"Raw Response: {e.message}"
                    logger.error(f"Gemini HTTP Error: {e.code} - {e.message}")
                    if e.code == 404:
                        err_msg = f"Model {self.model_name} is invalid, deprecated, or not accessible. {err_msg}"
                        status_code = 400
                    elif e.code == 429:
                        err_msg = f"AI provider rate limit reached. {err_msg}"
                        status_code = 429
                    elif e.code in (401, 403):
                        err_msg = f"Invalid API key or quota exceeded. {err_msg}"
                        status_code = 401
                else:
                    logger.error(f"Gemini generation hard failed on {self.model_name}: {e}")
                    
                raise AnalysisServiceError(err_msg, status_code)
                    
        raise AnalysisServiceError(f"Gemini request failed: {str(last_exc)}", 500)

    @staticmethod
    def _is_transient(exc: Exception) -> bool:
        if isinstance(exc, (socket.gaierror, TimeoutError, ConnectionError)):
            return True
        exc_str = str(exc).lower()
        if "timed out" in exc_str or "timeout" in exc_str or "503" in exc_str or "unavailable" in exc_str:
            return True
        if isinstance(exc, genai_errors.APIError):
            if hasattr(exc, 'code'):
                if exc.code >= 500 or exc.code == 429:
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

        last_exc = None
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
                        logger.warning(f"Gemini {self.model_name} failed on attempt {attempt}. Retrying in {wait_time}s... Error: {e}")
                        await asyncio.sleep(wait_time)
                        continue
                    else:
                        logger.error(f"Gemini {self.model_name} failed after 3 attempts with transient error: {e}")
                        # Fall through to the error handler below so we don't swallow the real error
                
                # Parse user-friendly error
                err_msg = str(e)
                status_code = 500
                if isinstance(e, genai_errors.APIError):
                    err_msg = f"Raw Response: {e.message}"
                    logger.error(f"Gemini HTTP Error: {e.code} - {e.message}")
                    if e.code == 404:
                        err_msg = f"Model {self.model_name} is invalid, deprecated, or not accessible. {err_msg}"
                        status_code = 400
                    elif e.code == 429:
                        err_msg = f"AI provider rate limit reached. {err_msg}"
                        status_code = 429
                    elif e.code in (401, 403):
                        err_msg = f"Invalid API key or quota exceeded. {err_msg}"
                        status_code = 401
                else:
                    logger.error(f"Gemini analysis hard failed on {self.model_name}: {e}")
                    
                raise AnalysisServiceError(err_msg, status_code)
                    
        raise AnalysisServiceError(f"Gemini request failed: {str(last_exc)}", 500)
