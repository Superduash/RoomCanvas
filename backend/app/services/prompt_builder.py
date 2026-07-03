from app.services.style_templates import STYLE_TEMPLATES

def build_prompt(room_type: str, style: str) -> tuple[str, str]:
    """
    Builds (prompt, negative_prompt) from room_type + style using the
    STYLE_TEMPLATES dict. Pure function, fully deterministic, no I/O.
    """
    # Normalize style key and room name
    style_key = style.lower().strip().replace(" ", "_")
    room_name = room_type.lower().strip().replace("_", " ")

    # Fallback template if style is not found
    template = STYLE_TEMPLATES.get(style_key)
    if not template:
        template = STYLE_TEMPLATES["modern_minimalist"]
        style_key = "modern_minimalist"

    palette_str = ", ".join(template["palette"])
    furniture_str = ", ".join(template["furniture"])

    # Build prompt
    prompt = (
        f"A professionally designed {room_name} in {style_key.replace('_', ' ').title()} style. "
        f"Featuring: {furniture_str}. "
        f"Color palette: {palette_str}. "
        f"Interior design photography, realistic shadows, high-end materials, 8k resolution, "
        f"architectural digest, daytime soft lighting, clean composition."
    )

    # Standard negative prompt for stable diffusion
    negative_prompt = (
        "low quality, blurry, worst quality, deformed, distorted, unrealistic proportions, "
        "cluttered, messy, extra walls, missing windows, out of frame, watermark, text, signature"
    )

    return prompt, negative_prompt
