import os
import uuid
import logging
from pathlib import Path
from PIL import Image
from fastapi import UploadFile
from app.config import settings
from app.utils.exceptions import InvalidImageError

logger = logging.getLogger(__name__)

def validate_image_file(upload_file: UploadFile) -> None:
    # Validate content-type
    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    if upload_file.content_type not in allowed_types:
        logger.warning(f"File validation failed. Unsupported content-type: {upload_file.content_type}")
        raise InvalidImageError(
            f"Unsupported file format: {upload_file.content_type}. Only JPEG, PNG, and WEBP are allowed."
        )

    # Validate file size
    try:
        upload_file.file.seek(0, 2)
        size_bytes = upload_file.file.tell()
        upload_file.file.seek(0)
    except Exception as e:
        logger.error(f"Failed to read file size: {e}")
        raise InvalidImageError("Could not read uploaded image size.")

    max_size_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if size_bytes > max_size_bytes:
        logger.warning(f"File size validation failed: {size_bytes} bytes exceeds {max_size_bytes} bytes limit.")
        raise InvalidImageError(
            f"Image size exceeds the limit of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

def save_upload(upload_file: UploadFile, directory: str) -> str:
    # Resolve directory relative to the workspace root or as provided
    base_dir = Path(directory)
    base_dir.mkdir(parents=True, exist_ok=True)

    # Extract extension or fallback
    ext = Path(upload_file.filename or "").suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        content_type_map = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp"
        }
        ext = content_type_map.get(upload_file.content_type, ".jpg")

    new_filename = f"{uuid.uuid4()}{ext}"
    dest_path = base_dir / new_filename

    # Save to disk
    try:
        upload_file.file.seek(0)
        with open(dest_path, "wb") as buffer:
            while chunk := upload_file.file.read(8192):
                buffer.write(chunk)
        logger.info(f"Saved upload file to {dest_path}")
    except Exception as e:
        logger.error(f"Error saving upload file: {e}")
        raise RuntimeError(f"Could not save upload file: {e}")

    # Return relative path from backend folder or workspace root
    # Since storage/ is usually located at the workspace root (or inside backend), let's keep it uniform.
    # The config has UPLOAD_DIR: "./storage/uploads"
    # Returning "storage/uploads/<uuid>.<ext>" fits FastAPI static mount.
    # Let's normalize it to use forward slashes
    relative_path = Path(directory) / new_filename
    return relative_path.as_posix()

def load_image(path: str) -> Image.Image:
    # Resolve path
    file_path = Path(path)
    if not file_path.exists():
        logger.error(f"Image path does not exist: {path}")
        raise FileNotFoundError(f"Image not found at {path}")
    try:
        return Image.open(file_path)
    except Exception as e:
        logger.error(f"Failed to load image from {path}: {e}")
        raise InvalidImageError(f"Could not load image: {e}")
