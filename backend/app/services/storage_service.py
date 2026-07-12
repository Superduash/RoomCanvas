import os
import uuid
import io
import asyncio
import httpx
import logging
from pathlib import Path
from fastapi import UploadFile
from supabase import create_client, Client
from app.config import settings
from app.repositories.generation_repository import GenerationRepository

logger = logging.getLogger(__name__)

_supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
_BUCKET = settings.SUPABASE_BUCKET

def is_storage_configured() -> bool:
    return bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY)


class StorageService:
    @staticmethod
    def _ext_for(filename: str | None, content_type: str | None) -> str:
        ext = Path(filename or "").suffix.lower()
        if ext in {".jpg", ".jpeg", ".png", ".webp"}:
            return ext
        content_type_map = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
        return content_type_map.get(content_type, ".jpg")

    @staticmethod
    def _upload_bytes(key: str, data: bytes, content_type: str) -> str:
        """Sync call — always run via asyncio.to_thread from async code, never awaited directly."""
        _supabase.storage.from_(_BUCKET).upload(
            path=key,
            file=data,
            file_options={"content-type": content_type, "upsert": "true"},
        )
        return key

    @staticmethod
    async def save_upload(upload_file: UploadFile, prefix: str = "uploads") -> str:
        ext = StorageService._ext_for(upload_file.filename, upload_file.content_type)
        key = f"{prefix}/{uuid.uuid4()}{ext}"

        try:
            from app.utils.image_utils import resize_for_upload
            from PIL import Image

            await upload_file.seek(0)
            img_bytes = await upload_file.read()
            img = Image.open(io.BytesIO(img_bytes))

            resized_bytes = resize_for_upload(img, max_dimension=1536)
            content_type = f"image/{ext.lstrip('.')}" if ext != ".jpg" else "image/jpeg"

            await asyncio.to_thread(StorageService._upload_bytes, key, resized_bytes, content_type)
            logger.info(f"Uploaded resized image to Supabase Storage: {key}")
        except Exception as e:
            logger.error(f"Error uploading file to Supabase: {e}")
            raise RuntimeError(f"Could not save upload file: {e}")

        return key  # store this key in the DB exactly where a local path used to go

    @staticmethod
    async def download_and_save(image_url: str, prefix: str = "generated") -> str:
        key = f"{prefix}/{uuid.uuid4().hex}_gen.png"
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(str(image_url))
                resp.raise_for_status()
                content = resp.content

            await asyncio.to_thread(StorageService._upload_bytes, key, content, "image/png")
            logger.info(f"Downloaded and uploaded generated image to Supabase Storage: {key}")
            return key
        except Exception as e:
            logger.error(f"Failed to download/upload image from {image_url}: {e}")
            raise RuntimeError(f"Could not save generated image: {e}")

    @staticmethod
    async def download_image_as_pil(key: str) -> "Image.Image":
        if not key:
            raise ValueError("Image key is empty")
        
        # If the key is already a full URL (e.g. legacy http path), use it, otherwise resolve it
        url = key if key.startswith("http") else StorageService.resolve_public_url(key)
        
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                content = resp.content
                
            from PIL import Image
            return Image.open(io.BytesIO(content))
        except Exception as e:
            logger.error(f"Failed to download image from Supabase at {url}: {e}")
            raise RuntimeError(f"Could not load image from Supabase: {e}")

    @staticmethod
    def resolve_public_url(key: str | None) -> str:
        if not key:
            return ""
        return _supabase.storage.from_(_BUCKET).get_public_url(key)

    @staticmethod
    def delete_file_if_exists(file_path: str):
        if not file_path:
            return
        try:
            _supabase.storage.from_(_BUCKET).remove([file_path])
            logger.info(f"Deleted file from Supabase Storage: {file_path}")
        except Exception as e:
            logger.warning(f"Could not delete file {file_path} from Supabase: {e}")

    @staticmethod
    def delete_by_url_if_exists(url: str):
        if not url:
            return
        bucket_segment = f"/{_BUCKET}/"
        if bucket_segment in url:
            key = url.split(bucket_segment, 1)[1]
            StorageService.delete_file_if_exists(key)


