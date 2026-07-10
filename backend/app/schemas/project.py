from datetime import datetime
from pydantic import BaseModel
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

class ProjectDetailsOut(BaseModel):
    project: ProjectOut
    timeline: list[GenerationOut]
