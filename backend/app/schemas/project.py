from datetime import datetime
from pydantic import BaseModel, field_validator
from app.schemas.generation import GenerationOut

class ProjectOut(BaseModel):
    id: int
    original_image_path: str
    room_type_detected: str | None = None
    style: str
    created_at: datetime
    last_updated_at: datetime
    version_count: int
    latest_generation: GenerationOut

    @field_validator("original_image_path")
    @classmethod
    def resolve_url(cls, v: str) -> str:
        if not v or v.startswith("http"):
            return v
        from app.services.storage_service import StorageService
        return StorageService.resolve_public_url(v)

class ProjectDetailsOut(BaseModel):
    project: ProjectOut
    timeline: list[GenerationOut]
