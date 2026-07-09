import sys
from app.database.session import SessionLocal
from app.repositories.generation_repository import GenerationRepository
import time

db = SessionLocal()
repo = GenerationRepository(db)

try:
    generation_data = {
        "original_image_path": "test.jpg",
        "style": "scandinavian",
        "redesign_prompt": "Redesign this room",
        "prompt_version": "v1",
        "analysis_json": "{}",
        "provider": "gemini",
        "provider_version": "0.1.0",
        "model_used": "gemini-2.5-flash",
        "model_version": "2024",
        "status": "failed_analysis",
        "processing_time_sec": 0.5,
        "error": "Gemini failed"
    }
    repo.create_generation(generation_data)
    print("Success")
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"Error: {e}")
