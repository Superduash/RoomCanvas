SUPPORTED_MODELS = {
    "gemini": {
        "text": [
            {"id": "gemini-3.1-flash-lite", "label": "Gemini 3.1 Flash Lite", "badge": "Default"},
            {"id": "gemini-2.5-flash", "label": "Gemini 2.5 Flash", "badge": "Free"},
            {"id": "gemini-3.5-flash", "label": "Gemini 3.5 Flash", "badge": "Free"},
            {"id": "gemini-3.1-pro", "label": "Gemini 3.1 Pro", "badge": "Paid"}
        ],
        "image": [
            {"id": "gemini-3.1-flash-image", "label": "Nano Banana 2", "badge": "Default"},
            {"id": "gemini-2.5-flash-image", "label": "Nano Banana", "badge": "Free"},
            {"id": "gemini-3-pro-image-preview", "label": "Nano Banana Pro", "badge": "Paid"}
        ]
    },
    "groq": {
        "text": [
            {"id": "llama-3.1-8b-instant", "label": "Llama 3.1 8B Instant", "badge": "Default"},
            {"id": "meta-llama/llama-4-scout-17b-16e-instruct", "label": "Llama 4 Scout 17B", "badge": "Free"},
            {"id": "openai/gpt-oss-20b", "label": "GPT-OSS 20B", "badge": "Free"},
            {"id": "openai/gpt-oss-120b", "label": "GPT-OSS 120B", "badge": "Paid"}
        ],
        "image": []
    },
    "replicate": {
        "text": [],
        "image": [
            {"id": "black-forest-labs/flux-kontext-pro", "label": "Flux Kontext Pro", "badge": "Default"},
            {"id": "google/imagen-4", "label": "Imagen 4", "badge": "Free"},
            {"id": "black-forest-labs/flux-1.1-pro", "label": "Flux 1.1 Pro", "badge": "Free"},
            {"id": "black-forest-labs/flux-2-pro", "label": "Flux 2 Pro", "badge": "Paid"}
        ]
    }
}

def is_model_supported(provider: str, model_id: str, model_type: str = "text") -> bool:
    """Check if a model exists in the supported registry."""
    if provider not in SUPPORTED_MODELS:
        return False
    
    models_list = SUPPORTED_MODELS[provider].get(model_type, [])
    return any(m["id"] == model_id for m in models_list)
