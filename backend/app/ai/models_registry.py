SUPPORTED_MODELS = {
    "gemini": {
        "text": [
            {"id": "gemini-2.5-flash", "label": "Gemini 2.5 Flash", "badge": "Recommended • Free"},
            {"id": "gemini-3-flash", "label": "Gemini 3 Flash", "badge": "Free"},
            {"id": "gemini-3.1-flash-lite", "label": "Gemini 3.1 Flash Lite", "badge": "Free"},
            {"id": "gemini-2.5-flash-lite", "label": "Gemini 2.5 Flash Lite", "badge": "Free"},
            {"id": "gemini-3.1-pro", "label": "Gemini 3.1 Pro", "badge": "Paid"},
            {"id": "gemini-2.5-pro", "label": "Gemini 2.5 Pro", "badge": "Paid"}
        ],
        "image": [
            {"id": "gemini-3.1-flash-image", "label": "Gemini 3.1 Flash Image", "badge": "Recommended • Free"},
            {"id": "gemini-3.1-flash-lite-image", "label": "Gemini 3.1 Flash Lite Image", "badge": "Free"},
            {"id": "gemini-2.5-flash-image", "label": "Gemini 2.5 Flash Image", "badge": "Free"},
            {"id": "gemini-3-pro-image", "label": "Gemini 3 Pro Image", "badge": "Paid"}
        ]
    },
    "groq": {
        "text": [
            {"id": "openai/gpt-oss-120b", "label": "GPT-OSS 120b", "badge": "Recommended • Free"},
            {"id": "llama-3.1-70b-versatile", "label": "Llama 3.1 70B", "badge": "Free"},
            {"id": "llama3-8b-8192", "label": "Llama 3 8B", "badge": "Free"},
            {"id": "mixtral-8x7b-32768", "label": "Mixtral 8x7B", "badge": "Free"}
        ],
        "image": []
    },
    "replicate": {
        "text": [],
        "image": [
            {"id": "black-forest-labs/flux-kontext-pro", "label": "Flux Kontext Pro", "badge": "Recommended • Free"},
            {"id": "black-forest-labs/flux-dev", "label": "Flux Dev", "badge": "Free"},
            {"id": "black-forest-labs/flux-schnell", "label": "Flux Schnell", "badge": "Free"}
        ]
    }
}

def is_model_supported(provider: str, model_id: str, model_type: str = "text") -> bool:
    """Check if a model exists in the supported registry."""
    if provider not in SUPPORTED_MODELS:
        return False
    
    models_list = SUPPORTED_MODELS[provider].get(model_type, [])
    return any(m["id"] == model_id for m in models_list)
