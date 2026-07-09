import io
from PIL import Image
from app.repositories.generation_repository import GenerationRepository

def test_refine_design_workflow(client, db):
    # 1. Create a completed base generation with a mock variation image
    repo = GenerationRepository(db)
    gen = repo.create_generation({
        "original_image_path": "uploads/base.jpg",
        "style": "modern",
        "redesign_prompt": "Redesign room",
        "model_used": "flux-kontext-pro",
        "processing_time_sec": 1.0,
        "status": "completed"
    })
    import os
    os.makedirs("storage/generated", exist_ok=True)
    img = Image.new('RGB', (10, 10), color='green')
    img.save("storage/generated/mock.png")
    
    repo.add_variations(gen.id, [{"image_path": "storage/generated/mock.png", "seed": 0}])
    
    # 2. POST /api/refine
    refine_resp = client.post(
        "/api/refine",
        json={"generation_id": gen.id, "instruction": "make sofa blue"}
    )
    assert refine_resp.status_code == 201
    assert refine_resp.json()["status"] == "pending"
    refine_id = refine_resp.json()["id"]
    
    # 3. Retrieve child generation (Background tasks ran synchronously in TestClient)
    db.commit() # release transaction boundary so we see background updates
    history_resp = client.get(f"/api/history/{refine_id}")
    assert history_resp.status_code == 200
    json_data = history_resp.json()
    assert json_data["status"] == "completed"
    assert json_data["parent_generation_id"] == gen.id
    assert json_data["redesign_prompt"] == "make sofa blue"
    assert len(json_data["variations"]) == 1
    assert json_data["variations"][0]["image_path"] is not None

def test_refine_design_not_found(client):
    response = client.post(
        "/api/refine",
        json={"generation_id": 9999, "instruction": "make sofa blue"}
    )
    assert response.status_code == 404
