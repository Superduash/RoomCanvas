from pydantic import BaseModel

class HealthResponse(BaseModel):
    status: str
    ai_mode: str

class ErrorResponse(BaseModel):
    detail: str
