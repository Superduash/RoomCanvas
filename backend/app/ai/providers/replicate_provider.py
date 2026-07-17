import logging
import socket
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception

from app.config import settings
from app.ai.providers.base_provider import GenerationProvider
from app.utils.exceptions import InferenceServiceError

logger = logging.getLogger(__name__)

def _is_transient(exc: Exception) -> bool:
    if isinstance(exc, (socket.gaierror, TimeoutError, ConnectionError, httpx.TimeoutException, httpx.NetworkError)):
        return True
    exc_str = str(exc)
    
    # We are returning the raw error message now.
    # We want to retry 429s for providers IF it is a generic rate limit, 
    # but fail fast if it specifically indicates a hard limit (e.g., payment required).
    # "Request was throttled" -> Replicate rate limit (retryable)
    if "429" in exc_str or "throttled" in exc_str.lower():
        # But wait! Tenacity wraps the exception or we raise InferenceServiceError.
        # Actually we DO want to retry rate limits now. We want _is_transient to return True for 429s!
        # Replicate says "Your rate limit resets in ~10s."
        return True

    return False

class ReplicateProvider(GenerationProvider):
    def __init__(self, api_token: str | None = None, model: str | None = None):
        self.api_token = api_token or settings.REPLICATE_API_TOKEN
        if not self.api_token:
            raise InferenceServiceError("REPLICATE_API_TOKEN is not configured and no user key provided.", 500)
        self.model = model or "black-forest-labs/flux-kontext-pro"

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=10, max=15),
        retry=retry_if_exception(_is_transient),
        reraise=True
    )
    async def generate(self, image_bytes: bytes, mime_type: str, prompt: str, seed: int = None) -> tuple[str, int]:
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
                api_token=self.api_token,
                timeout=httpx.Timeout(settings.REPLICATE_TIMEOUT_SECONDS)
            )
            
            if seed is None:
                import random
                seed = random.randint(0, 2**32 - 1)
            
            output = await client.async_run(
                self.model,
                input={
                    "input_image": file_obj,
                    "prompt": prompt,
                    "seed": seed,
                    "aspect_ratio": "match_input_image",
                    "output_format": "png"
                }
            )
            
            if isinstance(output, list):
                if not output:
                    raise InferenceServiceError("Empty response from Replicate")
                return (str(output[0]), seed)
            return (str(output), seed)
            
        except Exception as e:
            err_msg = str(e)
            status_code = 500
            
            # Extract raw response if it's an httpx error wrapped by replicate
            if hasattr(e, 'response') and hasattr(e.response, 'text'):
                err_msg = f"Raw Response: {e.response.text}"
                logger.error(f"Replicate HTTP Error: {err_msg}")
                if hasattr(e.response, 'headers'):
                    retry_after = e.response.headers.get("Retry-After")
                    if retry_after:
                        logger.warning(f"Replicate Retry-After header: {retry_after}")
            else:
                logger.error(f"Replicate generation failed: {e}")
            
            if hasattr(e, 'status') or hasattr(e, 'status_code'):
                code = getattr(e, 'status', getattr(e, 'status_code', 500))
                status_code = code
                if code == 404:
                    err_msg = f"Model {self.model} is invalid or not accessible with your API key. {err_msg}"
                elif code == 429:
                    err_msg = f"AI provider rate limit reached. {err_msg}"
                elif code in (401, 403):
                    err_msg = f"Invalid API key or quota exceeded. {err_msg}"
                    
            if "timeout" in err_msg.lower() or "timed out" in err_msg.lower():
                raise InferenceServiceError("Replicate request timed out. Please try again.", 504)
            raise InferenceServiceError(f"Replicate Error: {err_msg}", status_code)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=10, max=15),
        retry=retry_if_exception(_is_transient),
        reraise=True
    )
    async def refine(self, image_bytes: bytes, mime_type: str, instruction: str, seed: int = None) -> tuple[str, int]:
        try:
            import io
            file_obj = io.BytesIO(image_bytes)
            
            logger.info(f"Calling Replicate model {self.model} for refinement...")
            
            from replicate.client import Client
            import httpx
            client = Client(
                api_token=self.api_token,
                timeout=httpx.Timeout(settings.REPLICATE_TIMEOUT_SECONDS)
            )
            
            if seed is None:
                import random
                seed = random.randint(0, 2**32 - 1)

            output = await client.async_run(
                self.model,
                input={
                    "input_image": file_obj,
                    "prompt": instruction,
                    "seed": seed,
                    "aspect_ratio": "match_input_image",
                    "output_format": "png"
                }
            )
            
            if isinstance(output, list):
                if not output:
                    raise InferenceServiceError("Empty response from Replicate")
                return (str(output[0]), seed)
            return (str(output), seed)
            
        except Exception as e:
            err_msg = str(e)
            status_code = 500
            
            if hasattr(e, 'response') and hasattr(e.response, 'text'):
                err_msg = f"Raw Response: {e.response.text}"
                logger.error(f"Replicate HTTP Error: {err_msg}")
            else:
                logger.error(f"Replicate refinement failed: {e}")
            
            if hasattr(e, 'status') or hasattr(e, 'status_code'):
                code = getattr(e, 'status', getattr(e, 'status_code', 500))
                status_code = code
                if code == 404:
                    err_msg = f"Model {self.model} is invalid or not accessible with your API key. {err_msg}"
                elif code == 429:
                    err_msg = f"AI provider rate limit reached. {err_msg}"
                elif code in (401, 403):
                    err_msg = f"Invalid API key or quota exceeded. {err_msg}"
                    
            if "timeout" in err_msg.lower() or "timed out" in err_msg.lower():
                raise InferenceServiceError("Replicate request timed out. Please try again.", 504)
            raise InferenceServiceError(f"Replicate Error: {err_msg}", status_code)
