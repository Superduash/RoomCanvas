from datetime import datetime
from pydantic import BaseModel, ConfigDict

class VariationOut(BaseModel):
    id: int
    generation_id: int
    image_path: str
    seed: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class GenerationOut(BaseModel):
    id: int
    original_image_path: str
    control_image_path: str | None = None
    room_type_detected: str | None = None
    room_confidence: float | None = None
    style: str
    prompt_used: str
    model_used: str
    generation_time_sec: float
    selected_variation_id: int | None = None
    created_at: datetime
    variations: list[VariationOut] = []

    model_config = ConfigDict(from_attributes=True)

class GenerateResponse(GenerationOut):
    pass
