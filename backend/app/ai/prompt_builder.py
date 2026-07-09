import re
from app.ai.prompts.style_hints import STYLE_TEMPLATES

CURRENT_ANALYSIS_PROMPT_VERSION = "v1"

ANALYSIS_PROMPT_V1 = """
You are an expert interior designer. Analyze the provided room photo and return a structured JSON response.

Design it with the following style hint in mind: {style_hint}

Follow the requested JSON schema strictly. Ensure your redesign prompt describes exactly what to change in the image.
"""

def sanitize_prompt(text: str) -> str:
    """Sanitize user instruction: strip control characters, cap length to 2000, collapse whitespace."""
    # Strip control characters first
    text = "".join(ch for ch in text if ord(ch) >= 32)
    # Collapse whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()[:2000]

def get_analysis_prompt(style_id: str) -> str:
    style_info = STYLE_TEMPLATES.get(style_id)
    if style_info:
        style_hint = f"Style: {style_id}. Focus on: {', '.join(style_info['furniture'])}. Colors: {', '.join(style_info['palette'])}."
    else:
        style_hint = style_id

    return ANALYSIS_PROMPT_V1.format(style_hint=style_hint)

def build_generation_prompt(gemini_redesign_prompt: str) -> str:
    gemini_redesign_prompt = sanitize_prompt(gemini_redesign_prompt)
    return f"""{gemini_redesign_prompt}
Keep the room's structural layout unchanged — walls, windows, doors, and camera
perspective must match the original photo exactly. Only change furniture, decor,
colors, and lighting."""

def build_refinement_prompt(user_instruction: str) -> str:
    user_instruction = sanitize_prompt(user_instruction)
    return f"""{user_instruction}
Apply this change only. Keep everything else in the image exactly as it is —
same furniture placement, same room structure, same lighting style, same camera
angle — unless the instruction explicitly says otherwise."""
