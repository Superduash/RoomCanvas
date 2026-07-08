from app.database.models import Generation
from ai.services.orchestrator import GenerationOrchestrator

class AIService:
    """
    Main entry point for AI operations. The router calls this service,
    which delegates the complex workflow to the orchestrator.
    """
    def __init__(self, orchestrator: GenerationOrchestrator):
        self.orchestrator = orchestrator

    def generate_design(self, image_path: str, style: str, n: int = 3) -> Generation:
        """
        Generates a new interior design based on the original image and style.
        """
        return self.orchestrator.run(image_path, style, n)
