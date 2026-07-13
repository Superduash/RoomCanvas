#!/usr/bin/env python3
"""
Import validation script - tests all critical imports that caused deployment failures.
Run this before deployment to catch NameError and import issues early.
"""
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def test_imports():
    print("Testing critical imports...")
    errors = []
    
    try:
        print("  ✓ Importing database models...")
        from app.database.models import Generation, Variation, User
    except Exception as e:
        errors.append(f"Database models import failed: {e}")
        print(f"  ✗ Database models: {e}")
    
    try:
        print("  ✓ Importing generation_service...")
        from app.services.generation_service import GenerationService
    except Exception as e:
        errors.append(f"GenerationService import failed: {e}")
        print(f"  ✗ GenerationService: {e}")
    
    try:
        print("  ✓ Importing refinement_service...")
        from app.services.refinement_service import RefinementService
    except Exception as e:
        errors.append(f"RefinementService import failed: {e}")
        print(f"  ✗ RefinementService: {e}")
    
    try:
        print("  ✓ Importing analysis_service...")
        from app.services.analysis_service import AnalysisService
    except Exception as e:
        errors.append(f"AnalysisService import failed: {e}")
        print(f"  ✗ AnalysisService: {e}")
    
    try:
        print("  ✓ Importing storage_service...")
        from app.services.storage_service import StorageService
    except Exception as e:
        errors.append(f"StorageService import failed: {e}")
        print(f"  ✗ StorageService: {e}")
    
    try:
        print("  ✓ Importing all routers...")
        from app.routers import health, analyze, generate, refine, history, styles, providers, config, auth, measure
    except Exception as e:
        errors.append(f"Routers import failed: {e}")
        print(f"  ✗ Routers: {e}")
    
    try:
        print("  ✓ Importing repositories...")
        from app.repositories.generation_repository import GenerationRepository
    except Exception as e:
        errors.append(f"Repository import failed: {e}")
        print(f"  ✗ Repository: {e}")
    
    try:
        print("  ✓ Importing schemas...")
        from app.schemas.generation import GenerationOut, AnalyzeResponse, GenerateRequest, RefineRequest
    except Exception as e:
        errors.append(f"Schemas import failed: {e}")
        print(f"  ✗ Schemas: {e}")
    
    try:
        print("  ✓ Importing main application...")
        from app.main import app
    except Exception as e:
        errors.append(f"Main app import failed: {e}")
        print(f"  ✗ Main app: {e}")
    
    print("\n" + "="*60)
    if errors:
        print(f"FAILED: {len(errors)} import error(s) detected:\n")
        for error in errors:
            print(f"  - {error}")
        print("\nFix these errors before deploying!")
        return 1
    else:
        print("SUCCESS: All critical imports validated!")
        print("The application should start without import errors.")
        return 0

if __name__ == "__main__":
    sys.exit(test_imports())
