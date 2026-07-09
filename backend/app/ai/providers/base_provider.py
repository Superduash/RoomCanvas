from abc import ABC, abstractmethod

class AnalysisProvider(ABC):
    @abstractmethod
    async def analyze_room(self, image_bytes: bytes, mime_type: str, style_hint: str) -> dict:
        """Returns the structured analysis dict matching schemas.AnalysisResult."""
        pass

class GenerationProvider(ABC):
    @abstractmethod
    async def generate(self, image_bytes: bytes, mime_type: str, prompt: str) -> str:
        """Returns a URL to the generated image."""
        pass

    @abstractmethod
    async def refine(self, image_bytes: bytes, mime_type: str, instruction: str) -> str:
        """Same contract as generate(), but source image is a prior generation."""
        pass
