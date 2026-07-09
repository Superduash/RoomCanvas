import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
settings.GEMINI_API_KEY = "mock-gemini-key"
settings.REPLICATE_API_TOKEN = "mock-replicate-token"

# Setup in-memory database for testing
SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

import app.database.session as session_module
session_module.SessionLocal = TestingSessionLocal

from app.main import app
from app.database.session import Base, get_db
from app.ai.providers.provider_registry import _analysis_provider, _generation_provider, init_providers
from app.ai.providers.base_provider import AnalysisProvider, GenerationProvider

@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

# ── Mock Providers ─────────────────────────────────────────────────────────────
class MockAnalysisProvider(AnalysisProvider):
    async def analyze_room(self, image_bytes: bytes, mime_type: str, style_hint: str) -> dict:
        return {
            "room_type": "Living Room",
            "furniture": [
                {"item": "Sofa", "description": "Beige 3-seater sofa", "estimated_price_range": "$500-$800"}
            ],
            "estimated_dimensions": {"width_ft": 12.0, "length_ft": 15.0, "confidence": "high"},
            "layout_notes": "Good flow.",
            "color_palette": [{"name": "Cream", "hex": "#FFFDD0"}],
            "lighting_suggestions": "Add floor lamps.",
            "estimated_budget_range": "$1000-$2000",
            "style_explanation": "Scandinavian layout.",
            "redesign_prompt": " Scandinavian redesign with beige sofa."
        }

class MockGenerationProvider(GenerationProvider):
    async def generate(self, image_bytes: bytes, mime_type: str, prompt: str) -> str:
        return "https://replicate.delivery/pbxt/example.png"

    async def refine(self, image_bytes: bytes, mime_type: str, instruction: str) -> str:
        return "https://replicate.delivery/pbxt/refined.png"

@pytest.fixture(autouse=True)
def mock_ai_providers(monkeypatch):
    import app.main
    import app.ai.providers.provider_registry as registry
    from app.services.storage_service import StorageService
    
    # Stub init_providers on app.main directly because it is imported at module level
    monkeypatch.setattr(app.main, "init_providers", lambda: None)
    
    # Stub download_and_save to create a mock local image file instead of downloading
    def mock_download_and_save(url, save_dir="./storage/generated"):
        import os
        from PIL import Image
        os.makedirs(save_dir, exist_ok=True)
        path = os.path.join(save_dir, "mock_download.png")
        img = Image.new('RGB', (10, 10), color='blue')
        img.save(path)
        return path
        
    monkeypatch.setattr(StorageService, "download_and_save", mock_download_and_save)
    
    registry._analysis_provider = MockAnalysisProvider()
    registry._generation_provider = MockGenerationProvider()
    yield
    registry._analysis_provider = None
    registry._generation_provider = None

@pytest.fixture(autouse=True)
def clear_caches_between_tests():
    from app.cache import _history_cache, _gen_cache
    _history_cache.clear()
    _gen_cache.clear()
    yield
    _history_cache.clear()
    _gen_cache.clear()
