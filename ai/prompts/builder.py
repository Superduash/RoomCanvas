from ai.styles.templates import STYLE_TEMPLATES
from ai.prompts.negative import get_negative_prompt
from ai.prompts.system import get_system_prompt

def build_prompt(room_type: str, style: str) -> tuple[str, str]:
    """
    Builds (prompt, negative_prompt) from room_type + style.
    """
    style_key = style.lower().strip().replace(" ", "_")
    room_name = room_type.lower().strip().replace("_", " ")

    template = STYLE_TEMPLATES.get(style_key)
    if not template:
        template = STYLE_TEMPLATES["modern_minimalist"]
        style_key = "modern_minimalist"

    palette_str = ", ".join(template["palette"])
    furniture_str = ", ".join(template["furniture"])

    system_prompt = get_system_prompt()
    
    prompt = (
        f"A professionally designed {room_name} in {style_key.replace('_', ' ').title()} style. "
        f"Featuring: {furniture_str}. "
        f"Color palette: {palette_str}. "
        f"{system_prompt}"
    )

    return prompt, get_negative_prompt()
