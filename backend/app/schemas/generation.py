from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator

class VariationOut(BaseModel):
    id: int
    generation_id: int
    image_path: str
    seed: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("image_path")
    @classmethod
    def resolve_url(cls, v: str) -> str:
        if not v or v.startswith("http"):
            return v
        from app.services.storage_service import StorageService
        return StorageService.resolve_public_url(v)

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

    @field_validator("original_image_path")
    @classmethod
    def resolve_url(cls, v: str) -> str:
        if not v or v.startswith("http"):
            return v
        from app.services.storage_service import StorageService
        return StorageService.resolve_public_url(v)

class AnalyzeResponse(BaseModel):
    analysis_id: int
    room_type: str
    furniture: list[dict]
    estimated_dimensions: dict
    layout_notes: str
    color_palette: list[dict]
    lighting_suggestions: str
    budget_summary: dict
    style_explanation: str
    redesign_prompt: str

class CustomizationOptions(BaseModel):
    must_have_furniture: list[str] = []
    color_preference: str | None = None
    budget_tier: str | None = None
    lighting_preference: str | None = None
    room_width_ft: float | None = None
    room_length_ft: float | None = None
    avoid: list[str] = []
    style_override: str | None = None

class GenerateRequest(BaseModel):
    analysis_id: int
    force_new: bool = False
    customization: CustomizationOptions | None = None
    instruction: str | None = None

class GenerateResponse(GenerationOut):
    pass

class RefineRequest(BaseModel):
    generation_id: int
    instruction: str | None = None
    customization: CustomizationOptions | None = None

class RefineResponse(GenerationOut):
    pass
