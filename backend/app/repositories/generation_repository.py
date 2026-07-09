"""
generation_repository.py — Data access for Generation and Variation records.
Uses eager-loading (selectinload) to prevent N+1 query problems when
serializing variations alongside their parent generation.
"""
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, desc
from app.database.models import Generation, Variation
import logging

logger = logging.getLogger(__name__)

# ── Reusable eager-load options ────────────────────────────────────────────────
# Every query that returns a Generation includes its variations in ONE extra
# SELECT rather than one SELECT per row (N+1 prevention).
_GENERATION_LOAD_OPTIONS = (
    selectinload(Generation.variations),
    selectinload(Generation.selected_variation),
)


class GenerationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_generation(self, data: dict) -> Generation:
        generation = Generation(**data)
        self.db.add(generation)
        try:
            self.db.commit()
            self.db.refresh(generation)
            logger.info(f"Created Generation id={generation.id} status={generation.status}")
            return generation
        except Exception as e:
            self.db.rollback()
            raise e

    def add_variations(self, generation_id: int, variations: list[dict]) -> list[Variation]:
        variation_objs = []
        for var_data in variations:
            var_obj = Variation(**{**var_data, "generation_id": generation_id})
            self.db.add(var_obj)
            variation_objs.append(var_obj)
        self.db.commit()
        for var_obj in variation_objs:
            self.db.refresh(var_obj)
        logger.info(f"Added {len(variation_objs)} variation(s) to Generation id={generation_id}")
        return variation_objs

    def get_by_id(self, generation_id: int) -> Generation | None:
        query = (
            select(Generation)
            .where(Generation.id == generation_id)
            .options(*_GENERATION_LOAD_OPTIONS)
        )
        return self.db.execute(query).scalar_one_or_none()

    def list_all(self, limit: int = 50) -> list[Generation]:
        query = (
            select(Generation)
            .order_by(desc(Generation.created_at))
            .limit(limit)
            .options(*_GENERATION_LOAD_OPTIONS)
        )
        return list(self.db.execute(query).scalars().all())

    def set_selected_variation(self, generation_id: int, variation_id: int) -> Generation:
        generation = self.get_by_id(generation_id)
        if not generation:
            raise ValueError(f"Generation {generation_id} not found")

        var_query = select(Variation).where(
            Variation.id == variation_id,
            Variation.generation_id == generation_id
        )
        if not self.db.execute(var_query).scalar_one_or_none():
            raise ValueError(f"Variation {variation_id} does not belong to Generation {generation_id}")

        generation.selected_variation_id = variation_id
        self.db.commit()
        self.db.refresh(generation)
        logger.info(f"selected_variation_id={variation_id} on Generation id={generation_id}")
        return generation

    def update_status(self, generation_id: int, status: str) -> Generation:
        generation = self.get_by_id(generation_id)
        if not generation:
            raise ValueError(f"Generation {generation_id} not found")
        generation.status = status
        self.db.commit()
        self.db.refresh(generation)
        return generation

    def set_error(self, generation_id: int, error_msg: str) -> Generation:
        generation = self.get_by_id(generation_id)
        if not generation:
            raise ValueError(f"Generation {generation_id} not found")
        generation.status = "failed"
        generation.error = error_msg
        self.db.commit()
        self.db.refresh(generation)
        logger.warning(f"Generation id={generation_id} failed: {error_msg[:120]}")
        return generation

    def get_children(self, parent_id: int) -> list[Generation]:
        query = (
            select(Generation)
            .where(Generation.parent_generation_id == parent_id)
            .order_by(Generation.created_at)
            .options(*_GENERATION_LOAD_OPTIONS)
        )
        return list(self.db.execute(query).scalars().all())

    def delete(self, generation_id: int) -> bool:
        generation = self.get_by_id(generation_id)
        if not generation:
            return False
        self.db.delete(generation)
        self.db.commit()
        logger.info(f"Deleted Generation id={generation_id}")
        return True
