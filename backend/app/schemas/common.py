from pydantic import BaseModel

class HealthResponse(BaseModel):
    application: str
    database: str
    migrations: str
    firebase: str
    providers: dict[str, bool]

class ErrorResponse(BaseModel):
    detail: str
