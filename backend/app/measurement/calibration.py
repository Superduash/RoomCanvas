import math
from .schemas import Point2D
from .reference_objects import REFERENCE_OBJECTS

def calculate_pixel_distance(p1: Point2D, p2: Point2D) -> float:
    return math.hypot(p2.x - p1.x, p2.y - p1.y)

def calculate_scale(reference_type: str, ref_p1: Point2D, ref_p2: Point2D, custom_length_cm: float = None) -> float:
    """
    Returns cm per pixel based on the known reference object and the two points.
    We assume the two points represent the longest dimension (e.g., diagonal or height) of the reference object, 
    but for simplicity we'll just use the height/longest side of the reference object.
    For more accuracy, the frontend should specify whether it's width or height, but let's assume height for now.
    """
    if reference_type == 'custom':
        if not custom_length_cm:
            raise ValueError("custom_length_cm is required when reference_type is 'custom'")
        ref_real_length_cm = custom_length_cm
    else:
        if reference_type not in REFERENCE_OBJECTS:
            raise ValueError(f"Unknown reference object type: {reference_type}")
        # Use the max dimension (e.g. height) as the reference length
        ref_real_length_cm = max(REFERENCE_OBJECTS[reference_type])
    
    ref_pixel_length = calculate_pixel_distance(ref_p1, ref_p2)
    if ref_pixel_length == 0:
        raise ValueError("Reference points cannot be identical.")
        
    return ref_real_length_cm / ref_pixel_length

def measure_target(scale_cm_per_pixel: float, target_p1: Point2D, target_p2: Point2D) -> float:
    """
    Returns real distance in cm for the target points, assuming they are in the same plane as the reference object.
    """
    target_pixel_length = calculate_pixel_distance(target_p1, target_p2)
    return target_pixel_length * scale_cm_per_pixel

def cm_to_inches(cm: float) -> float:
    return cm / 2.54
