import math
from .schemas import Point2D
from .reference_objects import REFERENCE_OBJECTS

def calculate_pixel_distance(p1: Point2D, p2: Point2D) -> float:
    return math.hypot(p2.x - p1.x, p2.y - p1.y)

def get_reference_dimensions(reference_type: str, custom_length_cm: float = None) -> tuple[float, float]:
    """
    Returns (width_cm, height_cm) based on the known reference object.
    """
    if reference_type == 'custom':
        if not custom_length_cm:
            raise ValueError("custom_length_cm is required when reference_type is 'custom'")
        return custom_length_cm, custom_length_cm
    else:
        if reference_type not in REFERENCE_OBJECTS:
            raise ValueError(f"Unknown reference object type: {reference_type}")
        return REFERENCE_OBJECTS[reference_type]

def measure_target(scale_cm_per_pixel: float, target_p1: Point2D, target_p2: Point2D) -> float:
    """
    Returns real distance in cm for the target points, assuming they are in the same plane as the reference object.
    """
    target_pixel_length = calculate_pixel_distance(target_p1, target_p2)
    return target_pixel_length * scale_cm_per_pixel

def cm_to_inches(cm: float) -> float:
    return cm / 2.54
