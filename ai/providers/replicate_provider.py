import io
import os
import time
import logging
from typing import List, Dict, Tuple, Union
from PIL import Image
import replicate
import requests
import uuid

from ai.providers.base_provider import BaseAIProvider
from ai.config import ai_settings
try:
    from app.utils.exceptions import InferenceServiceError
except ImportError:
    from backend.app.utils.exceptions import InferenceServiceError
from ai.storage import download_and_save

logger = logging.getLogger(__name__)

SEEDS = [42, 123, 777]

class ReplicateProvider(BaseAIProvider):
    """
    Real InferenceService implementation using Replicate's hosted
    adirik/interior-design model.
    """

    def __init__(self, api_token: str | None = None):
        self.api_token = api_token or ai_settings.REPLICATE_API_TOKEN
        if not self.api_token:
            raise InferenceServiceError(
                "REPLICATE_API_TOKEN is not set. Get a free token at "
                "replicate.com/account/api-tokens and set it as an env var."
            )
        self.client = replicate.Client(api_token=self.api_token)
        self.model_id = ai_settings.MODELS.get(ai_settings.ACTIVE_MODEL, ai_settings.MODELS["quality"])

    def generate_variations(
        self,
        original_image: Image.Image,
        prompt: str,
        negative_prompt: str,
        n: int,
        save_dir: str,
    ) -> Tuple[List[Dict[str, Union[str, int]]], float, str]:
        start = time.time()

        buf = io.BytesIO()
        original_image.save(buf, format="PNG")
        buf.seek(0)

        params = ai_settings.DEFAULT_PARAMETERS

        variations = []
        for i, seed in enumerate(SEEDS[:n]):
            try:
                buf.seek(0)
                logger.info(f"Calling Replicate ({self.model_id}) — seed={seed} ({i+1}/{n})")
                output = self.client.run(
                    self.model_id,
                    input={
                        "image": buf,
                        "prompt": prompt,
                        "negative_prompt": negative_prompt,
                        "guidance_scale": params.get("guidance_scale", 15.0),
                        "prompt_strength": params.get("prompt_strength", 0.8),
                        "num_inference_steps": params.get("num_inference_steps", 50),
                        "seed": seed,
                    },
                )
                
                image_url = output[0] if isinstance(output, list) else output
                image_path = download_and_save(image_url, save_dir, seed)
                variations.append({"image_path": image_path, "seed": seed})

            except Exception as exc:
                logger.error(f"Replicate call failed for seed={seed}: {exc}")
                continue

        if not variations:
            raise InferenceServiceError(
                "All Replicate generation attempts failed. Check REPLICATE_API_TOKEN "
                "and your Replicate account balance/rate limits."
            )

        elapsed = time.time() - start
        return variations, elapsed, self.model_id
