import pytest
import io
from PIL import Image
from fastapi import UploadFile
from app.utils.image_utils import validate_image_file, resize_for_upload
from app.utils.exceptions import InvalidImageError

@pytest.mark.asyncio
async def test_validate_image_file_valid():
    # Construct a valid tiny JPEG image in memory
    img = Image.new('RGB', (100, 100), color='red')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_byte_arr.seek(0)
    
    upload = UploadFile(
        filename="test.jpg",
        file=img_byte_arr,
        headers={"content-type": "image/jpeg"}
    )
    # Should not raise exception
    validate_image_file(upload)

@pytest.mark.asyncio
async def test_validate_image_file_invalid_type():
    upload = UploadFile(
        filename="test.txt",
        file=io.BytesIO(b"not an image"),
        headers={"content-type": "text/plain"}
    )
    with pytest.raises(InvalidImageError) as exc:
        validate_image_file(upload)
    assert "Unsupported file format" in str(exc.value)

@pytest.mark.asyncio
async def test_validate_image_file_invalid_content_spoofed():
    # Spoofed content-type header, but body is plain text
    upload = UploadFile(
        filename="test.png",
        file=io.BytesIO(b"not a png image content"),
        headers={"content-type": "image/png"}
    )
    with pytest.raises(InvalidImageError) as exc:
        validate_image_file(upload)
    assert "not a valid image" in str(exc.value).lower()

@pytest.mark.asyncio
async def test_resize_for_upload():
    img = Image.new('RGB', (3000, 2000), color='blue')
    resized_bytes = resize_for_upload(img, max_dimension=1000)
    
    # Load and verify dimensions
    resized_img = Image.open(io.BytesIO(resized_bytes))
    w, h = resized_img.size
    assert max(w, h) == 1000
    assert w == 1000
    assert h == 666  # aspect ratio maintained (2000 * 1000 / 3000)
