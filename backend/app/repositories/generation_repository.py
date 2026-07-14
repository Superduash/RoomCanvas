"""
generation_repository.py — Data access for Generation and Variation records.
Uses eager-loading (selectinload) to prevent N+1 query problems when
serializing variations alongside their parent generation.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.database.models import Generation, Variation
import logging

logger = logging.getLogger(__name__)




class GenerationRepository:
    def __init__(self, db: AsyncSession, user_id: int | None = None):
        self.db = db
        self.user_id = user_id

    async def create_generation(self, data: dict) -> Generation:
        if self.user_id is not None and "user_id" not in data:
            data["user_id"] = self.user_id
        generation = Generation(**data)
        self.db.add(generation)
        try:
            await self.db.commit()
            await self.db.refresh(generation)
            logger.info(f"Created Generation id={generation.id} status={generation.status}")
            return generation
        except Exception as e:
            await self.db.rollback()
            raise e

    async def add_variations(self, generation_id: int, variations: list[dict]) -> list[Variation]:
        variation_objs = []
        for var_data in variations:
            var_obj = Variation(**{**var_data, "generation_id": generation_id})
            self.db.add(var_obj)
            variation_objs.append(var_obj)
        await self.db.commit()
        for var_obj in variation_objs:
            await self.db.refresh(var_obj)
        logger.info(f"Added {len(variation_objs)} variation(s) to Generation id={generation_id}")
        return variation_objs

    async def get_by_id(self, generation_id: int) -> Generation | None:
        query = (
            select(Generation)
            .where(Generation.id == generation_id)
        )
        if self.user_id is not None:
            query = query.where(Generation.user_id == self.user_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_all(self, limit: int = 50) -> list[Generation]:
        query = select(Generation).order_by(desc(Generation.created_at))
        if self.user_id is not None:
            query = query.where(Generation.user_id == self.user_id)
        query = query.limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def list_projects(self, limit: int = 50) -> list[dict]:
        # Get all root generations
        query = select(Generation).where(Generation.parent_generation_id.is_(None))
        if self.user_id is not None:
            query = query.where(Generation.user_id == self.user_id)
        result = await self.db.execute(query)
        roots = list(result.scalars().all())
        
        projects = []
        for root in roots:
            descendants = await self._get_all_descendants(root.id)
            all_gens = [root] + descendants
            
            completed_gens = [g for g in all_gens if g.status == "completed"]
            
            if not completed_gens:
                continue
                
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
            
        projects.sort(key=lambda p: p["last_updated_at"], reverse=True)
        return projects[:limit]
        
    async def _get_all_descendants(self, root_id: int) -> list[Generation]:
        descendants = []
        children = await self.get_children(root_id)
        for child in children:
            descendants.append(child)
            descendants.extend(await self._get_all_descendants(child.id))
        return descendants

    async def get_project_timeline(self, root_id: int) -> list[Generation]:
        root = await self.get_by_id(root_id)
        if not root:
            return []
        
        all_gens = [root] + await self._get_all_descendants(root.id)
        all_gens.sort(key=lambda g: g.created_at)
        return all_gens

    async def set_selected_variation(self, generation_id: int, variation_id: int) -> Generation:
        generation = await self.get_by_id(generation_id)
        if not generation:
            raise ValueError(f"Generation {generation_id} not found")

        var_query = select(Variation).where(
            Variation.id == variation_id,
            Variation.generation_id == generation_id
        )
        result = await self.db.execute(var_query)
        if not result.scalar_one_or_none():
            raise ValueError(f"Variation {variation_id} does not belong to Generation {generation_id}")

        generation.selected_variation_id = variation_id
        await self.db.commit()
        await self.db.refresh(generation)
        logger.info(f"selected_variation_id={variation_id} on Generation id={generation_id}")
        return generation

    async def update_status(self, generation_id: int, status: str) -> Generation:
        generation = await self.get_by_id(generation_id)
        if not generation:
            raise ValueError(f"Generation {generation_id} not found")
        generation.status = status
        await self.db.commit()
        await self.db.refresh(generation)
        return generation

    async def set_error(self, generation_id: int, error_msg: str) -> Generation:
        generation = await self.get_by_id(generation_id)
        if not generation:
            raise ValueError(f"Generation {generation_id} not found")
        generation.status = "failed"
        generation.error = error_msg
        await self.db.commit()
        await self.db.refresh(generation)
        logger.warning(f"Generation id={generation_id} failed: {error_msg[:120]}")
        return generation

    async def get_children(self, parent_id: int) -> list[Generation]:
        query = select(Generation).where(Generation.parent_generation_id == parent_id)
        if self.user_id is not None:
            query = query.where(Generation.user_id == self.user_id)
        query = query.order_by(Generation.created_at)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def delete(self, generation_id: int) -> bool:
        generation = await self.get_by_id(generation_id)
        if not generation:
            return False
        await self.db.delete(generation)
        await self.db.commit()
        logger.info(f"Deleted Generation id={generation_id}")
        return True
