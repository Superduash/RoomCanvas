from sqlalchemy import select
import pytest
from app.database.models import Generation, Variation, User
from firebase_admin import auth as firebase_auth


@pytest.mark.asyncio
async def test_delete_account_removes_user_and_related_rows(client, db, monkeypatch):
    monkeypatch.setattr(firebase_auth, 'delete_user', lambda uid: None)

    result = await db.execute(select(User).filter(User.firebase_uid == 'mock-uid'))
    user = result.scalar_one_or_none()
    if not user:
        user = User(firebase_uid='mock-uid', email='test@test.com', display_name='Test')
        db.add(user)
        await db.commit()
        await db.refresh(user)

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
    await db.commit()
    await db.refresh(generation)

    variation = Variation(
        generation_id=generation.id,
        image_path='generated/variation.jpg',
        seed=123,
    )
    db.add(variation)
    await db.commit()
    await db.refresh(variation)

    generation.selected_variation_id = variation.id
    await db.commit()

    response = client.delete('/api/auth/me', headers={'Authorization': 'Bearer mock-token'})

    assert response.status_code == 204
    assert len((await db.execute(select(User))).scalars().all()) == 0
    assert len((await db.execute(select(Generation))).scalars().all()) == 0
    assert len((await db.execute(select(Variation))).scalars().all()) == 0