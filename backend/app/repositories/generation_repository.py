from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from app.database.models import Generation, Variation
import logging

logger = logging.getLogger(__name__)

class GenerationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_generation(self, data: dict) -> Generation:
        generation = Generation(**data)
        self.db.add(generation)
        self.db.commit()
        self.db.refresh(generation)
        logger.info(f"Created Generation record with ID {generation.id}")
        return generation

    def add_variations(self, generation_id: int, variations: list[dict]) -> list[Variation]:
        variation_objs = []
        for var_data in variations:
            var_data_with_fk = {**var_data, "generation_id": generation_id}
            var_obj = Variation(**var_data_with_fk)
            self.db.add(var_obj)
            variation_objs.append(var_obj)
        self.db.commit()
        
        # Refresh all variations to get database IDs
        for var_obj in variation_objs:
            self.db.refresh(var_obj)
            
        logger.info(f"Added {len(variation_objs)} variations to Generation ID {generation_id}")
        return variation_objs

    def get_by_id(self, generation_id: int) -> Generation | None:
        query = select(Generation).where(Generation.id == generation_id)
        result = self.db.execute(query).scalar_one_or_none()
        return result

    def list_all(self, limit: int = 50) -> list[Generation]:
        query = select(Generation).order_by(desc(Generation.created_at)).limit(limit)
        result = self.db.execute(query).scalars().all()
        return list(result)

    def set_selected_variation(self, generation_id: int, variation_id: int) -> Generation:
        generation = self.get_by_id(generation_id)
        if not generation:
            logger.error(f"Failed to set selected variation. Generation {generation_id} not found.")
            raise ValueError(f"Generation with id {generation_id} not found")
        
        # Verify the variation belongs to this generation
        var_query = select(Variation).where(
            Variation.id == variation_id, 
            Variation.generation_id == generation_id
        )
        variation = self.db.execute(var_query).scalar_one_or_none()
        if not variation:
            logger.error(f"Variation {variation_id} does not belong to Generation {generation_id}")
            raise ValueError(f"Variation with id {variation_id} does not belong to Generation {generation_id}")

        generation.selected_variation_id = variation_id
        self.db.commit()
        self.db.refresh(generation)
        logger.info(f"Set selected_variation_id={variation_id} for Generation {generation_id}")
        return generation
