from pydantic import BaseModel

class HealthResponse(BaseModel):
    status: str
    providers: dict[str, bool]

class ErrorResponse(BaseModel):
    detail: str
