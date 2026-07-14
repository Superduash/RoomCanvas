from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.measurement.schemas import MeasurementRequest, MeasurementResult
from app.measurement.calibration import get_reference_dimensions, cm_to_inches
from app.measurement.vanishing_point import correct_for_perspective

import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Measurement"])

@router.post("/measure", response_model=MeasurementResult)
def measure_image(request: MeasurementRequest, db: AsyncSession = Depends(get_db)):
    try:
        # Get reference dimensions
        ref_width_cm, ref_height_cm = get_reference_dimensions(
            request.reference_object_type,
            request.custom_reference_length_cm
        )
        
        # Calculate real distance of the target points
        # Using correct_for_perspective for 4-corner perspective correction
        real_dist_cm, confidence = correct_for_perspective(
            request.reference_corners,
            ref_width_cm,
            ref_height_cm,
            request.target_points[0],
            request.target_points[1]
        )
        
        from app.measurement.calibration import calculate_pixel_distance
        pixel_dist = calculate_pixel_distance(request.target_points[0], request.target_points[1])
        
        return MeasurementResult(
            pixel_distance=pixel_dist,
            real_distance_cm=real_dist_cm,
            real_distance_inches=cm_to_inches(real_dist_cm),
            confidence=confidence
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Internal measurement error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during measurement.")
