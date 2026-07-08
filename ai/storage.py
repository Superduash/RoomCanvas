import os
import uuid
import requests
from typing import Optional

def download_and_save(image_url: str, save_dir: str, seed: int) -> str:
    """
    Downloads an image from a URL and saves it to the local storage.
    Useful for models like Replicate that return URLs instead of image bytes.
    """
    os.makedirs(save_dir, exist_ok=True)
    filename = f"{uuid.uuid4().hex}_seed{seed}.png"
    filepath = os.path.join(save_dir, filename)

    resp = requests.get(str(image_url), timeout=30)
    resp.raise_for_status()
    with open(filepath, "wb") as f:
        f.write(resp.content)

    return filepath
