from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.measurement.schemas import MeasurementRequest, MeasurementResult
from app.measurement.calibration import calculate_scale, cm_to_inches
from app.measurement.vanishing_point import correct_for_perspective

router = APIRouter(tags=["Measurement"])

@router.post("/measure", response_model=MeasurementResult)
def measure_image(request: MeasurementRequest, db: AsyncSession = Depends(get_db)):
    try:
        # Calculate scale based on the reference object
        scale_cm_per_px = calculate_scale(
            request.reference_object_type,
            request.reference_points[0],
            request.reference_points[1]
        )
        
        # Calculate real distance of the target points
        # Using correct_for_perspective which wraps measure_target for now
        real_dist_cm = correct_for_perspective(
            scale_cm_per_px,
            request.target_points[0],
            request.target_points[1]
        )
        
        from app.measurement.calibration import calculate_pixel_distance
        pixel_dist = calculate_pixel_distance(request.target_points[0], request.target_points[1])
        
        return MeasurementResult(
            pixel_distance=pixel_dist,
            real_distance_cm=real_dist_cm,
            real_distance_inches=cm_to_inches(real_dist_cm),
            confidence="medium" # Placeholder: if we had auto-detect, confidence could be derived
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal measurement error: {e}")
