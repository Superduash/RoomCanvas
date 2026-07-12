from pydantic import BaseModel

class HealthResponse(BaseModel):
    application: str
    database: str
    firebase: str
    providers: dict[str, bool]

class ErrorResponse(BaseModel):
    detail: str
