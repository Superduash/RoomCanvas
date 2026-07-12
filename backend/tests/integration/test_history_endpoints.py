from app.repositories.generation_repository import GenerationRepository

def test_history_endpoints_workflow(client, db):
    from app.database.models import User
    # Explicitly create and commit the mock user so it exists before we create records or call endpoints
    user = User(
        firebase_uid="mock-uid",
        email="test@example.com",
        display_name="Test User"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    repo = GenerationRepository(db, user_id=user.id)


    
    # 1. Populate DB
    gen = repo.create_generation({
        "original_image_path": "uploads/img1.jpg",
        "style": "bohemian",
        "redesign_prompt": "Redesign room",
        "model_used": "flux-kontext-pro",
        "processing_time_sec": 12.3,
        "status": "completed"
    })
    vars_added = repo.add_variations(gen.id, [{"image_path": "storage/generated/v1.png", "seed": 0}])
    
    # 2. list history
    resp = client.get("/api/history")
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["id"] == gen.id
    
    # 3. get legacy history detail
    resp = client.get(f"/api/history/{gen.id}")
    assert resp.status_code == 200
    assert resp.json()["style"] == "bohemian"
    
    # 4. get canonical generation detail
    resp = client.get(f"/api/generation/{gen.id}")
    assert resp.status_code == 200
    assert resp.json()["style"] == "bohemian"
    
    # 5. select variation
    resp = client.post(f"/api/history/{gen.id}/select/{vars_added[0].id}")
    assert resp.status_code == 200
    assert resp.json()["selected_variation_id"] == vars_added[0].id
    
    # 6. delete generation
    resp = client.delete(f"/api/history/{gen.id}")
    assert resp.status_code == 200
    assert resp.json() == {"deleted": True}
    
    # Verify DB is empty
    assert len(repo.list_all()) == 0
