import pytest
import firebase_admin
from fastapi import HTTPException
from app.auth.dependencies import get_current_user
from app.auth.firebase_admin_init import is_firebase_available
from fastapi.testclient import TestClient

def test_firebase_unavailable_behavior(monkeypatch, db):
    # Simulate Firebase being unconfigured/unavailable
    monkeypatch.setattr(firebase_admin, "_apps", [])
    
    assert is_firebase_available() is False
    
    # get_current_user should raise a 503 HTTPException
    with pytest.raises(HTTPException) as exc_info:
        import asyncio
        asyncio.run(get_current_user(authorization="Bearer token", db=db))
    assert exc_info.value.status_code == 503
    assert "unavailable" in exc_info.value.detail

def test_auth_endpoint_returns_503_when_firebase_unavailable(monkeypatch):
    # Simulate Firebase being unconfigured/unavailable
    monkeypatch.setattr(firebase_admin, "_apps", [])
    
    from app.main import app
    # Create client without overrides so it tests the real get_current_user behavior
    with TestClient(app) as client:
        response = client.get("/api/auth/me", headers={"Authorization": "Bearer some-token"})
        assert response.status_code == 503
        assert "unavailable" in response.json()["detail"]
