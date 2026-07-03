from abc import ABC, abstractmethod
from PIL import Image, ImageEnhance
from pathlib import Path
import time
import uuid
import logging

logger = logging.getLogger(__name__)

class InferenceService(ABC):
    @abstractmethod
    def generate_variations(
        self,
        original_image: Image.Image,
        control_image_path: str,
        prompt: str,
        negative_prompt: str,
        n: int,
        save_dir: str,
    ) -> tuple[list[dict], float, str]:
        """
        Returns (variations, generation_time_sec, model_used) where each
        variation dict is {"image_path": str, "seed": int}.
        """
        pass

class MockInferenceService(InferenceService):
    """
    Mock implementation: generates n variations by applying a distinct,
    deterministic PIL image transform to the original per seed (e.g. slight
    color/contrast/saturation shifts per variation), saves each, and returns
    real elapsed wall-clock time from an actual (short) time.sleep to simulate
    realistic latency (e.g. 1.5s) so the frontend's progress UI has something
    real to show. model_used = "mock-v1".
    """
    def generate_variations(
        self,
        original_image: Image.Image,
        control_image_path: str,
        prompt: str,
        negative_prompt: str,
        n: int,
        save_dir: str,
    ) -> tuple[list[dict], float, str]:
        logger.info(f"Mocking inference call for {n} variations.")
        start_time = time.time()
        
        # Simulate network or model processing latency
        time.sleep(1.5)
        
        # Ensure save directory exists
        dest_dir = Path(save_dir)
        dest_dir.mkdir(parents=True, exist_ok=True)
        
        # Seeds specified in requirements
        seeds = [42, 123, 777]
        # Pad seeds if n is greater
        while len(seeds) < n:
            seeds.append(seeds[-1] + 1)
        seeds = seeds[:n]
        
        variations = []
        for index, seed in enumerate(seeds):
            # Apply deterministic PIL image enhancement depending on the seed
            transformed_img = original_image.copy()
            
            if seed == 42:
                # Modern minimalist / Scandinavian look: bright, reduced saturation
                transformed_img = ImageEnhance.Color(transformed_img).enhance(0.5)
                transformed_img = ImageEnhance.Brightness(transformed_img).enhance(1.2)
            elif seed == 123:
                # Bohemian / Warm look: highly saturated, warm tone
                transformed_img = ImageEnhance.Color(transformed_img).enhance(1.4)
                transformed_img = ImageEnhance.Contrast(transformed_img).enhance(1.1)
            elif seed == 777:
                # Industrial / Dark look: high contrast, lower brightness
                transformed_img = ImageEnhance.Contrast(transformed_img).enhance(1.5)
                transformed_img = ImageEnhance.Brightness(transformed_img).enhance(0.85)
                transformed_img = ImageEnhance.Color(transformed_img).enhance(0.7)
            else:
                # Simple fallback shift
                factor = 0.5 + (seed % 10) / 10.0
                transformed_img = ImageEnhance.Color(transformed_img).enhance(factor)
            
            # Save the new variation
            filename = f"var_{uuid.uuid4()}_s{seed}.png"
            dest_path = dest_dir / filename
            transformed_img.save(dest_path)
            
            variations.append({
                "image_path": dest_path.as_posix(),
                "seed": seed
            })
            
        elapsed_time = time.time() - start_time
        model_used = "mock-v1"
        logger.info(f"Mock generation finished in {elapsed_time:.2f} seconds.")
        
        return variations, elapsed_time, model_used
