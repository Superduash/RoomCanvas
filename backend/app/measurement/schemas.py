from typing import Literal, List
from pydantic import BaseModel, Field

class Point2D(BaseModel):
    x: float
    y: float

class MeasurementRequest(BaseModel):
    image_id: int
    reference_object_type: Literal['credit_card', 'a4_paper', 'letter_paper', 'standard_door', 'custom']
    reference_corners: List[Point2D] = Field(..., min_length=4, max_length=4, description="Four corners of the reference object: top-left, top-right, bottom-right, bottom-left")
    reference_edge: Literal['width', 'height'] = Field(
        default='height',
        description="Which real-world edge (width or height) the two reference_points correspond to."
    )
    target_points: List[Point2D] = Field(..., min_length=2, max_length=2, description="Two points to measure distance between")
    custom_reference_length_cm: float | None = None

class MeasurementResult(BaseModel):
    pixel_distance: float
    real_distance_cm: float
    real_distance_inches: float
    confidence: Literal['high', 'medium', 'low']
