import pytest
import io
from PIL import Image

@pytest.mark.asyncio
async def test_generate_design_workflow(client, db):
    # 1. First upload and analyze
    img = Image.new('RGB', (100, 100), color='green')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_byte_arr.seek(0)
    
    analyze_resp = client.post(
        "/api/analyze",
        data={"style": "scandinavian"},
        files={"image": ("test.jpg", img_byte_arr, "image/jpeg")}
    )
    analysis_id = analyze_resp.json()["analysis_id"]
    
    # 2. Call generate (API response is pending)
    gen_resp = client.post(
        "/api/generate",
        json={"analysis_id": analysis_id}
    )
    assert gen_resp.status_code == 201
    assert gen_resp.json()["status"] == "pending"
    
    # 3. Fetch generation from history (Background tasks run synchronously in TestClient)
    await db.commit() # release transaction snapshot so we see background updates
    history_resp = client.get(f"/api/history/{analysis_id}")
    assert history_resp.status_code == 200
    assert history_resp.json()["status"] == "completed"
    assert history_resp.json()["provider"] == "replicate"
    assert history_resp.json()["model_used"] == "black-forest-labs/flux-kontext-pro"
    assert len(history_resp.json()["variations"]) == 1
    assert history_resp.json()["variations"][0]["image_path"] is not None

@pytest.mark.asyncio
async def test_generate_design_not_found(client):
    response = client.post(
        "/api/generate",
        json={"analysis_id": 9999}
    )
    assert response.status_code == 404
