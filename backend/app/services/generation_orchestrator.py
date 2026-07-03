"""
GenerationOrchestrator — coordinates the full design pipeline.

Pipeline stages:
    1. Load original image from disk.
    2. MLSD structure extraction → saves edge-map control image.
    3. CLIP zero-shot room classification → room_type + confidence.
    4. Prompt builder → (prompt, negative_prompt) for diffusion.
    5. Inference service → n design variations (PIL images → saved to disk).
    6. Repository → write Generation + Variation rows to the database.
    7. Return the fully-populated Generation ORM record.
"""
import logging
from app.config import settings
from app.database.models import Generation
from app.repositories.generation_repository import GenerationRepository
from app.services.mlsd_service import MlsdService
from app.services.clip_service import ClipService
from app.services.inference_service import InferenceService
from app.services.prompt_builder import build_prompt
from app.utils.image_utils import load_image
from app.utils.exceptions import InferenceServiceError

logger = logging.getLogger(__name__)


class GenerationOrchestrator:
    def __init__(
        self,
        mlsd_service: MlsdService,
        clip_service: ClipService,
        inference_service: InferenceService,
        repository: GenerationRepository,
    ) -> None:
        self.mlsd_service = mlsd_service
        self.clip_service = clip_service
        self.inference_service = inference_service
        self.repository = repository

    def run(self, image_path: str, style: str, n: int = 3) -> Generation:
        """
        Execute the full generation pipeline and return the persisted Generation record.

        Args:
            image_path: Absolute or relative path to the uploaded original image.
            style:      Design style key (e.g. "modern_minimalist").
            n:          Number of variations to generate (default: 3).

        Returns:
            Fully-populated Generation ORM instance (with variations eager-loaded).

        Raises:
            InferenceServiceError: On failure at any pipeline stage.
        """
        logger.info("Starting pipeline — style=%r  image=%r  n=%d", style, image_path, n)

        # ── Stage 1: Load image ───────────────────────────────────────────────
        try:
            image = load_image(image_path)
            logger.info("Stage 1 ✓ — image loaded.")
        except Exception as exc:
            logger.error("Stage 1 ✗ — image load failed: %s", exc)
            raise InferenceServiceError(f"Failed to load uploaded image: {exc}") from exc

        # ── Stage 2: MLSD structural extraction ──────────────────────────────
        try:
            control_image_path = self.mlsd_service.extract_structure(
                image, save_dir=settings.CONTROL_IMAGE_DIR
            )
            logger.info("Stage 2 ✓ — control image saved to %r.", control_image_path)
        except Exception as exc:
            logger.error("Stage 2 ✗ — MLSD extraction failed: %s", exc)
            raise InferenceServiceError(f"Structural line extraction failed: {exc}") from exc

        # ── Stage 3: CLIP room classification ────────────────────────────────
        try:
            room_type, room_confidence = self.clip_service.classify_room(image)
            logger.info(
                "Stage 3 ✓ — room=%r  confidence=%.2f", room_type, room_confidence
            )
        except Exception as exc:
            logger.error("Stage 3 ✗ — CLIP classification failed: %s", exc)
            raise InferenceServiceError(f"Room classification failed: {exc}") from exc

        # ── Stage 4: Prompt construction ──────────────────────────────────────
        try:
            prompt, negative_prompt = build_prompt(room_type, style)
            logger.info("Stage 4 ✓ — prompt constructed.")
        except Exception as exc:
            logger.error("Stage 4 ✗ — prompt builder failed: %s", exc)
            raise InferenceServiceError(f"Prompt construction failed: {exc}") from exc

        # ── Stage 5: Inference / variation generation ─────────────────────────
        try:
            variations, generation_time, model_used = self.inference_service.generate_variations(
                original_image=image,
                control_image_path=control_image_path,
                prompt=prompt,
                negative_prompt=negative_prompt,
                n=n,
                save_dir=settings.GENERATED_DIR,
            )
            logger.info(
                "Stage 5 ✓ — %d variation(s) generated in %.2fs using %r.",
                len(variations), generation_time, model_used,
            )
        except Exception as exc:
            logger.error("Stage 5 ✗ — inference failed: %s", exc)
            raise InferenceServiceError(f"Model inference failed: {exc}") from exc

        # ── Stage 6: Persist to database ──────────────────────────────────────
        try:
            generation_record = self.repository.create_generation({
                "original_image_path": image_path,
                "control_image_path": control_image_path,
                "room_type_detected": room_type,
                "room_confidence": room_confidence,
                "style": style,
                "prompt_used": prompt,
                "model_used": model_used,
                "generation_time_sec": generation_time,
                "selected_variation_id": None,
            })
            self.repository.add_variations(generation_record.id, variations)

            final_record = self.repository.get_by_id(generation_record.id)
            if final_record is None:
                raise ValueError("Persisted generation record could not be retrieved.")

            logger.info("Stage 6 ✓ — Generation #%d saved to database.", final_record.id)
            return final_record
        except Exception as exc:
            logger.error("Stage 6 ✗ — database write failed: %s", exc)
            raise InferenceServiceError(f"Database persistence failed: {exc}") from exc
