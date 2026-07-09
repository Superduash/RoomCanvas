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
    room_type_detected: str | None = None
    room_confidence: float | None = None
    style: str
    redesign_prompt: str
    prompt_version: str | None = None
    analysis_json: str | None = None
    parent_generation_id: int | None = None
    provider: str | None = None
    provider_version: str | None = None
    model_used: str
    model_version: str | None = None
    status: str
    error: str | None = None
    processing_time_sec: float
    selected_variation_id: int | None = None
    created_at: datetime
    variations: list[VariationOut] = []

    model_config = ConfigDict(from_attributes=True)

class AnalyzeResponse(BaseModel):
    analysis_id: int
    room_type: str
    furniture: list[dict]
    estimated_dimensions: dict
    layout_notes: str
    color_palette: list[dict]
    lighting_suggestions: str
    estimated_budget_range: str
    style_explanation: str
    redesign_prompt: str

class GenerateRequest(BaseModel):
    analysis_id: int
    force_new: bool = False

class GenerateResponse(GenerationOut):
    pass

class RefineRequest(BaseModel):
    generation_id: int
    instruction: str

class RefineResponse(GenerationOut):
    pass
