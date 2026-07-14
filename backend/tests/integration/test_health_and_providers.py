import pytest
@pytest.mark.asyncio
async def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["application"] == "ready"
    assert "providers" in response.json()

@pytest.mark.asyncio
async def test_providers_check(client):
    response = client.get("/api/providers")
    assert response.status_code == 200
    assert "analysis" in response.json()
    assert "generation" in response.json()
    assert response.json()["analysis"]["active"] == "gemini"

@pytest.mark.asyncio
async def test_styles_check(client):
    response = client.get("/api/styles")
    assert response.status_code == 200
    styles = response.json()
    assert len(styles) > 0
    assert any(s["id"] == "modern_minimalist" for s in styles)

@pytest.mark.asyncio
async def test_config_check(client):
    response = client.get("/api/config")
    assert response.status_code == 200
    assert "max_upload_mb" in response.json()
    assert "allowed_types" in response.json()
