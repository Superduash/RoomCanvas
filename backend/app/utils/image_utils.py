import io
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
        
    # Content-based image validation (Pillow verify)
    # NOTE: Image.verify() closes the internal file handle, so we read into a buffer first.
    try:
        upload_file.file.seek(0)
        img_bytes = upload_file.file.read()
        img = Image.open(io.BytesIO(img_bytes))
        img.verify()  # Verifies it is an actual image
        upload_file.file.seek(0)  # Reset for subsequent reads
    except Exception as e:
        logger.error(f"Image content verification failed: {e}")
        raise InvalidImageError("The uploaded file is not a valid image.")

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

def resize_for_upload(image: Image.Image, max_dimension: int = 1536) -> bytes:
    w, h = image.size
    if max(w, h) > max_dimension:
        scale = max_dimension / max(w, h)
        new_w, new_h = int(w * scale), int(h * scale)
        image = image.resize((new_w, new_h), Image.LANCZOS)
    
    # Convert to RGB if necessary before saving to JPEG
    if image.mode in ('RGBA', 'LA') or (image.mode == 'P' and 'transparency' in image.info):
        image = image.convert('RGB')
        
    out = io.BytesIO()
    image.save(out, format="JPEG", quality=90)
    return out.getvalue()
