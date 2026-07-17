SUPPORTED_MODELS = {
    "gemini": {
        "text": [
            {
                "id": "gemini-2.5-flash", "label": "Gemini 2.5 Flash", "badge": "Free",
                "provider": "gemini", "vision": True, "supports_image_generation": False, "supports_text": True,
                "supports_streaming": True, "supports_json": True, "supports_reasoning": False,
                "recommended": True, "tier": "free", "speed": "fast"
            },
            {
                "id": "gemini-3.1-flash-lite", "label": "Gemini 3.1 Flash Lite", "badge": "Free",
                "provider": "gemini", "vision": True, "supports_image_generation": False, "supports_text": True,
                "supports_streaming": True, "supports_json": True, "supports_reasoning": False,
                "recommended": False, "tier": "free", "speed": "fast"
            },
            {
                "id": "gemini-3.5-flash", "label": "Gemini 3.5 Flash", "badge": "Free",
                "provider": "gemini", "vision": True, "supports_image_generation": False, "supports_text": True,
                "supports_streaming": True, "supports_json": True, "supports_reasoning": False,
                "recommended": False, "tier": "free", "speed": "fast"
            },
            {
                "id": "gemini-3.1-pro", "label": "Gemini 3.1 Pro", "badge": "Requires billing",
                "provider": "gemini", "vision": True, "supports_image_generation": False, "supports_text": True,
                "supports_streaming": True, "supports_json": True, "supports_reasoning": True,
                "recommended": False, "tier": "paid", "speed": "medium"
            }
        ],
        "image": [
            {
                "id": "imagen-3.0-generate-001", "label": "Imagen 3.0", "badge": "Requires billing",
                "provider": "gemini", "vision": False, "supports_image_generation": True, "supports_text": False,
                "supports_streaming": False, "supports_json": False, "supports_reasoning": False,
                "recommended": True, "tier": "paid", "speed": "medium"
            },
            {
                "id": "imagen-3.0-fast-generate-001", "label": "Imagen 3.0 Fast", "badge": "Requires billing",
                "provider": "gemini", "vision": False, "supports_image_generation": True, "supports_text": False,
                "supports_streaming": False, "supports_json": False, "supports_reasoning": False,
                "recommended": False, "tier": "paid", "speed": "fast"
            }
        ]
    },
    "groq": {
        "text": [
            {
                "id": "meta-llama/llama-4-scout-17b-16e-instruct", "label": "Llama 4 Scout 17B", "badge": "Free",
                "provider": "groq", "vision": True, "supports_image_generation": False, "supports_text": True,
                "supports_streaming": True, "supports_json": True, "supports_reasoning": False,
                "recommended": True, "tier": "free", "speed": "fast"
            },
            {
                "id": "llama-3.1-8b-instant", "label": "Llama 3.1 8B", "badge": "Free",
                "provider": "groq", "vision": False, "supports_image_generation": False, "supports_text": True,
                "supports_streaming": True, "supports_json": True, "supports_reasoning": False,
                "recommended": False, "tier": "free", "speed": "very_fast"
            }
        ],
        "image": []
    },
    "replicate": {
        "text": [],
        "image": [
            {
                "id": "black-forest-labs/flux-kontext-pro", "label": "Flux Kontext Pro", "badge": "Requires billing",
                "provider": "replicate", "vision": False, "supports_image_generation": True, "supports_text": False,
                "supports_streaming": False, "supports_json": False, "supports_reasoning": False,
                "recommended": True, "tier": "paid", "speed": "medium"
            },
            {
                "id": "google/imagen-4", "label": "Imagen 4", "badge": "Requires billing",
                "provider": "replicate", "vision": False, "supports_image_generation": True, "supports_text": False,
                "supports_streaming": False, "supports_json": False, "supports_reasoning": False,
                "recommended": False, "tier": "paid", "speed": "medium"
            },
            {
                "id": "black-forest-labs/flux-1.1-pro", "label": "Flux 1.1 Pro", "badge": "Requires billing",
                "provider": "replicate", "vision": False, "supports_image_generation": True, "supports_text": False,
                "supports_streaming": False, "supports_json": False, "supports_reasoning": False,
                "recommended": False, "tier": "paid", "speed": "fast"
            },
            {
                "id": "black-forest-labs/flux-2-pro", "label": "Flux 2 Pro", "badge": "Requires billing",
                "provider": "replicate", "vision": False, "supports_image_generation": True, "supports_text": False,
                "supports_streaming": False, "supports_json": False, "supports_reasoning": False,
                "recommended": False, "tier": "paid", "speed": "slow"
            }
        ]
    }
}

def is_model_supported(provider: str, model_id: str, model_type: str = "text") -> bool:
    """Check if a model exists in the supported registry."""
    if provider not in SUPPORTED_MODELS:
        return False
    
    models_list = SUPPORTED_MODELS[provider].get(model_type, [])
    return any(m["id"] == model_id for m in models_list)

def supports_vision(provider: str, model_id: str, model_type: str = "text") -> bool:
    """Check if a model supports vision."""
    if provider not in SUPPORTED_MODELS:
        return False
    
    models_list = SUPPORTED_MODELS[provider].get(model_type, [])
    for m in models_list:
        if m["id"] == model_id:
            return m.get("vision", False)
    return False
