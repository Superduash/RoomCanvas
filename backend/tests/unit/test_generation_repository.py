import pytest
from app.repositories.generation_repository import GenerationRepository
from app.database.models import Generation, Variation

def test_crud_operations(db):
    repo = GenerationRepository(db)
    
    # 1. Create
    data = {
        "original_image_path": "uploads/image.jpg",
        "style": "modern",
        "redesign_prompt": "Redesign room in modern style",
        "model_used": "flux-kontext-pro",
        "processing_time_sec": 10.5,
        "status": "analyzed"
    }
    gen = repo.create_generation(data)
    assert gen.id is not None
    assert gen.status == "analyzed"
    
    # 2. Get by ID
    fetched = repo.get_by_id(gen.id)
    assert fetched is not None
    assert fetched.style == "modern"
    
    # 3. Add variations
    vars_added = repo.add_variations(gen.id, [{"image_path": "generated/img.png", "seed": 0}])
    assert len(vars_added) == 1
    assert vars_added[0].id is not None
    
    # 4. List all
    all_gens = repo.list_all()
    assert len(all_gens) == 1
    assert all_gens[0].id == gen.id
    
    # 5. Set selected variation
    repo.set_selected_variation(gen.id, vars_added[0].id)
    fetched = repo.get_by_id(gen.id)
    assert fetched.selected_variation_id == vars_added[0].id
    
    # 6. Update status
    repo.update_status(gen.id, "completed")
    fetched = repo.get_by_id(gen.id)
    assert fetched.status == "completed"
    
    # 7. Set error
    repo.set_error(gen.id, "Failed model run")
    fetched = repo.get_by_id(gen.id)
    assert fetched.status == "failed"
    assert fetched.error == "Failed model run"
    
    # 8. Create a child refinement
    child_data = {
        "original_image_path": "uploads/image.jpg",
        "style": "modern",
        "redesign_prompt": "make sofa blue",
        "model_used": "flux-kontext-pro",
        "processing_time_sec": 5.0,
        "status": "completed",
        "parent_generation_id": gen.id
    }
    child = repo.create_generation(child_data)
    assert child.parent_generation_id == gen.id
    
    children = repo.get_children(gen.id)
    assert len(children) == 1
    assert children[0].id == child.id
    
    # 9. Delete
    deleted = repo.delete(gen.id)
    assert deleted is True
    assert repo.get_by_id(gen.id) is None
    # Variations should be cascade deleted
    assert db.query(Variation).filter_by(generation_id=gen.id).count() == 0
