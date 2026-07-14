from .schemas import Point2D

def correct_for_perspective(ref_corners: list[Point2D], ref_width_cm: float, ref_height_cm: float,
                             target_p1: Point2D, target_p2: Point2D) -> tuple[float, str]:
    """
    ref_corners: 4 points, in order [top-left, top-right, bottom-right, bottom-left] of the
    reference object as tapped by the user.
    Returns (real_distance_cm, confidence).
    """
    from .calibration import calculate_pixel_distance
    top_edge_px = calculate_pixel_distance(ref_corners[0], ref_corners[1])
    left_edge_px = calculate_pixel_distance(ref_corners[0], ref_corners[3])

    scale_from_width = ref_width_cm / top_edge_px if top_edge_px > 0 else 0
    scale_from_height = ref_height_cm / left_edge_px if left_edge_px > 0 else 0

    if scale_from_width == 0 or scale_from_height == 0:
        return 0.0, "low"

    # If the two independently-derived scales disagree a lot, the photo has significant
    # perspective distortion relative to the reference plane — flag lower confidence.
    disagreement = abs(scale_from_width - scale_from_height) / max(scale_from_width, scale_from_height)
    avg_scale = (scale_from_width + scale_from_height) / 2

    target_px = calculate_pixel_distance(target_p1, target_p2)
    real_cm = target_px * avg_scale

    if disagreement < 0.05:
        confidence = "high"
    elif disagreement < 0.15:
        confidence = "medium"
    else:
        confidence = "low"

    return real_cm, confidence
