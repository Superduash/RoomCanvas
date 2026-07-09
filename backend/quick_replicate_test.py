import os, replicate
from app.config import settings

os.environ["REPLICATE_API_TOKEN"] = settings.REPLICATE_API_TOKEN
client = replicate.Client(api_token=os.environ["REPLICATE_API_TOKEN"])
output = client.run(
    "black-forest-labs/flux-kontext-pro",
    input={"input_image": open("storage/uploads/90cc5346-2f71-4a37-b43c-37cc1f1173ca.jpg", "rb"), "prompt": "Redesign this room in modern minimalist style, add furniture."}
)
print("OUTPUT:", output)
