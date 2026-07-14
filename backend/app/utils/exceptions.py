class InteriorAIError(Exception):
    """Base exception for all application errors."""
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code

class InvalidImageError(InteriorAIError):
    """Raised when an uploaded image fails validation (size, content-type)."""
    def __init__(self, message: str):
        super().__init__(message, status_code=400)

class GenerationNotFoundError(InteriorAIError):
    """Raised when a requested generation or variation is not found in the DB."""
    def __init__(self, message: str):
        super().__init__(message, status_code=404)

class InferenceServiceError(InteriorAIError):
    """Raised when an error occurs during the AI inference process."""
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message, status_code)

class AnalysisServiceError(InteriorAIError):
    """Raised when an error occurs during the AI analysis process."""
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message, status_code)

class RefinementServiceError(InteriorAIError):
    """Raised when an error occurs during the AI refinement process."""
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message, status_code)

class ProviderUnavailableError(InteriorAIError):
    """Raised when an AI provider is unavailable or not configured."""
    def __init__(self, message: str):
        super().__init__(message, status_code=400)
