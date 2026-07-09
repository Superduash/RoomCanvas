import logging
import replicate
import socket
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception

from app.config import settings
from app.ai.providers.base_provider import GenerationProvider
from app.utils.exceptions import InferenceServiceError
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)

class ReplicateProvider(GenerationProvider):
    def __init__(self):
        if not settings.REPLICATE_API_TOKEN:
            raise InferenceServiceError("REPLICATE_API_TOKEN is not configured", 500)
        self.model = "black-forest-labs/flux-kontext-pro"
        pass
        
    @staticmethod
    def _is_transient(exc: Exception) -> bool:
        if isinstance(exc, (socket.gaierror, TimeoutError, ConnectionError, httpx.TimeoutException, httpx.NetworkError)):
            return True
        return False

    @retry(
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception(_is_transient),
        reraise=True
    )
    async def generate(self, image_bytes: bytes, mime_type: str, prompt: str) -> str:
        try:
            import io
            import uuid
            file_obj = io.BytesIO(image_bytes)
            file_obj.name = f"upload_{uuid.uuid4().hex}.jpg"
            
            logger.info(f"Calling Replicate model {self.model} for generation...")
            
            # Instantiate client here to ensure it binds to the current event loop
            from replicate.client import Client
            import httpx
            client = Client(
                api_token=settings.REPLICATE_API_TOKEN,
                timeout=httpx.Timeout(settings.REPLICATE_TIMEOUT_SECONDS)
            )
            
            output = await client.async_run(
                self.model,
                input={
                    "input_image": file_obj,
                    "prompt": prompt
                }
            )
            
            if isinstance(output, list):
                if not output:
                    raise InferenceServiceError("Empty response from Replicate")
                return str(output[0])
            return str(output)
            
        except Exception as e:
            logger.error(f"Replicate generation failed: {e}")
            import httpx
            if isinstance(e, httpx.TimeoutException) or "timeout" in str(e).lower() or "timed out" in str(e).lower():
                raise InferenceServiceError("Replicate request timed out. Please try again.", 504)
            raise InferenceServiceError(f"Replicate generation failed: {str(e)}", 500)

    @retry(
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception(_is_transient),
        reraise=True
    )
    async def refine(self, image_bytes: bytes, mime_type: str, instruction: str) -> str:
        try:
            import io
            file_obj = io.BytesIO(image_bytes)
            
            logger.info(f"Calling Replicate model {self.model} for refinement...")
            
            output = await self.client.async_run(
                self.model,
                input={
                    "input_image": file_obj,
                    "prompt": instruction
                }
            )
            
            if isinstance(output, list):
                if not output:
                    raise InferenceServiceError("Empty response from Replicate")
                return str(output[0])
            return str(output)
            
        except Exception as e:
            logger.error(f"Replicate refinement failed: {e}")
            import httpx
            if isinstance(e, httpx.TimeoutException) or "timeout" in str(e).lower() or "timed out" in str(e).lower():
                raise InferenceServiceError("Replicate request timed out. Please try again.", 504)
            raise InferenceServiceError(f"Replicate refinement failed: {str(e)}", 500)
