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
    def __init__(self, db: Session, user_id: int | None = None):
        self.db = db
        self.user_id = user_id

    def create_generation(self, data: dict) -> Generation:
        if self.user_id is not None and "user_id" not in data:
            data["user_id"] = self.user_id
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
        )
        if self.user_id is not None:
            query = query.where(Generation.user_id == self.user_id)
        query = query.options(*_GENERATION_LOAD_OPTIONS)
        return self.db.execute(query).scalar_one_or_none()

    def list_all(self, limit: int = 50) -> list[Generation]:
        query = select(Generation).order_by(desc(Generation.created_at))
        if self.user_id is not None:
            query = query.where(Generation.user_id == self.user_id)
        query = query.limit(limit).options(*_GENERATION_LOAD_OPTIONS)
        return list(self.db.execute(query).scalars().all())

    def list_projects(self, limit: int = 50) -> list[dict]:
        # Get all root generations
        query = select(Generation).where(Generation.parent_generation_id.is_(None))
        if self.user_id is not None:
            query = query.where(Generation.user_id == self.user_id)
        query = query.options(*_GENERATION_LOAD_OPTIONS)
        roots = list(self.db.execute(query).scalars().all())
        
        projects = []
        for root in roots:
            # We need to find all descendants to determine latest and count.
            # In SQLite, recursive CTE is complex, so we will fetch all generations
            # that are part of this tree.
            # Note: For simple non-branching refinements this is just root + children + grandchildren.
            # A simpler way in this specific app is to fetch all generations
            # where root is ancestor, but since refinements are linear we can just loop,
            # or better, fetch all generations and build trees in memory.
            # Let's fetch all descendants for this root manually.
            
            descendants = self._get_all_descendants(root.id)
            all_gens = [root] + descendants
            
            # Latest generation is the one with highest created_at (completed ideally)
            completed_gens = [g for g in all_gens if g.status == "completed"]
            
            if not completed_gens:
                latest = all_gens[-1]
            else:
                latest = max(completed_gens, key=lambda g: g.created_at)
                
            last_updated_at = max(g.created_at for g in all_gens)
            version_count = len(all_gens)
            
            projects.append({
                "id": root.id,
                "original_image_path": root.original_image_path,
                "room_type_detected": root.room_type_detected,
                "style": root.style,
                "created_at": root.created_at,
                "last_updated_at": last_updated_at,
                "version_count": version_count,
                "latest_generation": latest
            })
            
        # Sort projects by last updated time descending
        projects.sort(key=lambda p: p["last_updated_at"], reverse=True)
        return projects[:limit]
        
    def _get_all_descendants(self, root_id: int) -> list[Generation]:
        # Recursive fetch
        descendants = []
        children = self.get_children(root_id)
        for child in children:
            descendants.append(child)
            descendants.extend(self._get_all_descendants(child.id))
        return descendants

    def get_project_timeline(self, root_id: int) -> list[Generation]:
        root = self.get_by_id(root_id)
        if not root:
            return []
        
        all_gens = [root] + self._get_all_descendants(root.id)
        # Sort by creation time (timeline order)
        all_gens.sort(key=lambda g: g.created_at)
        return all_gens

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
        query = select(Generation).where(Generation.parent_generation_id == parent_id)
        if self.user_id is not None:
            query = query.where(Generation.user_id == self.user_id)
        query = query.order_by(Generation.created_at).options(*_GENERATION_LOAD_OPTIONS)
        return list(self.db.execute(query).scalars().all())

    def delete(self, generation_id: int) -> bool:
        generation = self.get_by_id(generation_id)
        if not generation:
            return False
        self.db.delete(generation)
        self.db.commit()
        logger.info(f"Deleted Generation id={generation_id}")
        return True
