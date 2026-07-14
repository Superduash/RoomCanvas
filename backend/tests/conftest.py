import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
import pytest_asyncio

# Setup in-memory async database for testing
SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite://"

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

import app.database.session as session_module
session_module.AsyncSessionLocal = TestingSessionLocal
session_module.engine = engine

from app.main import app
from app.database.session import Base, get_db
from app.ai.providers.provider_registry import _analysis_provider, _generation_provider, init_providers
from app.ai.providers.base_provider import AnalysisProvider, GenerationProvider

@pytest_asyncio.fixture(scope="function")
async def db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestingSessionLocal() as session:
        yield session
        
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture(scope="function")
def client(db):
    async def override_get_db():
        async with TestingSessionLocal() as session:
            yield session

    from app.auth.dependencies import get_current_user
    from app.database.models import User

    async def override_get_current_user():
        from sqlalchemy import select
        result = await db.execute(select(User).filter(User.firebase_uid == "mock-uid"))
        user = result.scalar_one_or_none()
        if not user:
            user = User(
                firebase_uid="mock-uid",
                email="test@example.com",
                display_name="Test User"
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        return user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
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
            "redesign_prompt": " Scandinavian redesign with beige sofa.",
            "space_occupancy": "cluttered",
            "open_floor_area_pct": 20
        }

class MockGenerationProvider(GenerationProvider):
    async def generate(self, image_bytes: bytes, mime_type: str, prompt: str, seed: int = None) -> tuple[str, int]:
        return "https://replicate.delivery/pbxt/example.png", seed or 0

    async def refine(self, image_bytes: bytes, mime_type: str, instruction: str, seed: int = None) -> tuple[str, int]:
        return "https://replicate.delivery/pbxt/refined.png", seed or 0


@pytest.fixture(autouse=True)
def mock_ai_providers(monkeypatch):
    import app.main
    import app.ai.providers.provider_registry as registry
    from app.services.storage_service import StorageService
    
    # Stub init_providers on app.main directly because it is imported at module level
    monkeypatch.setattr(app.main, "init_providers", lambda: None)
    
    # Stub download_and_save to create a mock local image file instead of downloading
    async def mock_download_and_save(url, save_dir="./storage/generated"):
        import os
        from PIL import Image
        os.makedirs(save_dir, exist_ok=True)
        path = os.path.join(save_dir, "mock_download.png")
        img = Image.new('RGB', (10, 10), color='blue')
        img.save(path)
        return path
        
    async def mock_save_upload(upload_file, prefix="uploads"):
        return f"{prefix}/mock_upload.jpg"
        
    async def mock_download_image_as_pil(path):
        from PIL import Image
        return Image.new('RGB', (10, 10), color='green')
        
    monkeypatch.setattr(StorageService, "download_and_save", staticmethod(mock_download_and_save))
    monkeypatch.setattr(StorageService, "save_upload", staticmethod(mock_save_upload))
    monkeypatch.setattr(StorageService, "download_image_as_pil", staticmethod(mock_download_image_as_pil))

    
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
