from abc import ABC, abstractmethod
from typing import List, Dict, Tuple, Union
from PIL import Image

class BaseAIProvider(ABC):
    """
    Abstract base class for all AI inference providers.
    Enforces a consistent interface regardless of the underlying model/service.
    """
    
    @abstractmethod
    def generate_variations(
        self,
        original_image: Image.Image,
        prompt: str,
        negative_prompt: str,
        n: int,
        save_dir: str,
    ) -> Tuple[List[Dict[str, Union[str, int]]], float, str]:
        """
        Generates n design variations based on the original image and prompt.
        
        Args:
            original_image: The uploaded PIL Image of the room.
            prompt: Positive conditioning prompt.
            negative_prompt: Negative conditioning prompt.
            n: Number of variations to generate.
            save_dir: Directory path where generated images should be saved.
            
        Returns:
            A tuple of (variations, elapsed_time_seconds, model_used_id).
            variations is a list of dicts containing {"image_path": str, "seed": int}.
        """
        pass
