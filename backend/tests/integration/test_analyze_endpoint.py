import io
from PIL import Image

def test_analyze_room_success(client):
    # Construct a valid tiny JPEG image
    img = Image.new('RGB', (100, 100), color='blue')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_byte_arr.seek(0)
    
    response = client.post(
        "/api/analyze",
        data={"style": "scandinavian"},
        files={"image": ("test.jpg", img_byte_arr, "image/jpeg")}
    )
    
    assert response.status_code == 201
    json_data = response.json()
    assert json_data["analysis_id"] is not None
    assert json_data["room_type"] == "Living Room"
    assert json_data["redesign_prompt"] == " Scandinavian redesign with beige sofa."
    assert "width_ft" in json_data["estimated_dimensions"]

def test_analyze_room_validation_error(client):
    response = client.post(
        "/api/analyze",
        data={"style": "scandinavian"},
        files={"image": ("test.txt", io.BytesIO(b"not an image"), "text/plain")}
    )
    
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]
