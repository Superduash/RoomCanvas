from app.database.models import Generation, Variation, User
from firebase_admin import auth as firebase_auth


def test_delete_account_removes_user_and_related_rows(client, db, monkeypatch):
    monkeypatch.setattr(firebase_auth, 'delete_user', lambda uid: None)

    user = db.query(User).filter(User.firebase_uid == 'mock-uid').first()

    generation = Generation(
        user_id=user.id,
        original_image_path='uploads/original.jpg',
        style='modern',
        redesign_prompt='prompt',
        model_used='gemini',
        processing_time_sec=1.5,
        status='completed',
    )
    db.add(generation)
    db.commit()
    db.refresh(generation)

    variation = Variation(
        generation_id=generation.id,
        image_path='generated/variation.jpg',
        seed=123,
    )
    db.add(variation)
    db.commit()
    db.refresh(variation)

    generation.selected_variation_id = variation.id
    db.commit()

    response = client.delete('/api/auth/me', headers={'Authorization': 'Bearer mock-token'})

    assert response.status_code == 204
    assert db.query(User).count() == 0
    assert db.query(Generation).count() == 0
    assert db.query(Variation).count() == 0