from abc import ABC, abstractmethod

class AnalysisProvider(ABC):
    @abstractmethod
    async def analyze_room(self, image_bytes: bytes, mime_type: str, style_hint: str) -> dict:
        """Returns the structured analysis dict matching schemas.AnalysisResult."""
        pass

class GenerationProvider(ABC):
    @abstractmethod
    async def generate(self, image_bytes: bytes, mime_type: str, prompt: str, seed: int = None) -> tuple[str, int]:
        """Returns a tuple of (URL to generated image, seed used)."""
        pass

    @abstractmethod
    async def refine(self, image_bytes: bytes, mime_type: str, instruction: str, seed: int = None) -> tuple[str, int]:
        """Same contract as generate(), but source image is a prior generation."""
        pass
