import os
import uuid
import httpx
import logging
from pathlib import Path
from fastapi import UploadFile
from app.config import settings
from app.repositories.generation_repository import GenerationRepository

logger = logging.getLogger(__name__)

class StorageService:
    @staticmethod
    def save_upload(upload_file: UploadFile, directory: str = settings.UPLOAD_DIR) -> str:
        base_dir = Path(directory)
        base_dir.mkdir(parents=True, exist_ok=True)

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

        try:
            from app.utils.image_utils import resize_for_upload
            from PIL import Image
            import io
            
            upload_file.file.seek(0)
            img_bytes = upload_file.file.read()
            img = Image.open(io.BytesIO(img_bytes))
            
            # Downscale for performance and storage
            resized_bytes = resize_for_upload(img, max_dimension=1536) # using 1536 as a good trade-off
            
            with open(dest_path, "wb") as buffer:
                buffer.write(resized_bytes)
                
            logger.info(f"Saved and downscaled upload file to {dest_path}")
        except Exception as e:
            logger.error(f"Error saving upload file: {e}")
            raise RuntimeError(f"Could not save upload file: {e}")

        return dest_path.as_posix()

    @staticmethod
    async def download_and_save(image_url: str, save_dir: str = settings.GENERATED_DIR) -> str:
        base_dir = Path(save_dir)
        base_dir.mkdir(parents=True, exist_ok=True)
        filename = f"{uuid.uuid4().hex}_gen.png"
        filepath = base_dir / filename

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(str(image_url))
                resp.raise_for_status()
                with open(filepath, "wb") as f:
                    f.write(resp.content)
            logger.info(f"Downloaded generated image to {filepath}")
            return filepath.as_posix()
        except Exception as e:
            logger.error(f"Failed to download image from {image_url}: {e}")
            raise RuntimeError(f"Could not save generated image: {e}")


    @staticmethod
    def delete_file_if_exists(file_path: str):
        if not file_path:
            return
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Deleted file {file_path}")
        except Exception as e:
            logger.warning(f"Could not delete file {file_path}: {e}")

    @staticmethod
    def delete_generation_files(generation_id: int, repository: GenerationRepository):
        generation = repository.get_by_id(generation_id)
        if not generation:
            return

        files_to_delete = []
        if generation.original_image_path:
            files_to_delete.append(generation.original_image_path)
        
        for variation in generation.variations:
            if variation.image_path:
                files_to_delete.append(variation.image_path)
                
        for file_path in files_to_delete:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"Deleted file {file_path}")
            except Exception as e:
                logger.error(f"Failed to delete file {file_path}: {e}")
