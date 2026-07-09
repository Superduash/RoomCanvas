import re
from app.ai.prompts.style_hints import STYLE_TEMPLATES

CURRENT_ANALYSIS_PROMPT_VERSION = "v1"

ANALYSIS_PROMPT_V1 = """
You are an expert interior designer. Analyze the provided room photo and return a structured JSON response.

Detect and explicitly document the room's physical architecture:
- Walls and their positions
- Windows and their placements
- Doors and structural openings
- Ceiling height
- Primary lighting direction (natural and artificial)
- Current furniture placement and flow

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

QUALITY_SUFFIX = """
Render as a photorealistic architectural visualization: physically accurate lighting
and shadows consistent with the original light sources, realistic material textures
(fabric weave, wood grain, metal reflectivity), and clean, precise geometry with no
warping or distortion. This should look like a professional interior design rendering
for a high-end residential project, not a stylized or illustrative image.
"""

def build_generation_prompt(gemini_redesign_prompt: str, analysis_data: dict = None) -> str:
    gemini_redesign_prompt = sanitize_prompt(gemini_redesign_prompt)
    
    arch_hints = ""
    if analysis_data and "architecture" in analysis_data:
        arch = analysis_data["architecture"]
        arch_hints = (
            f"Preserve the existing room structure exactly: "
            f"Walls ({arch.get('walls', 'keep as is')}), "
            f"Windows ({arch.get('windows', 'keep as is')}), "
            f"Doors ({arch.get('doors', 'keep as is')}), "
            f"Ceiling height ({arch.get('ceiling_height', 'keep as is')}). "
            f"Preserve the original lighting direction ({arch.get('lighting_direction', 'keep original')}). "
        )

    return f"""{gemini_redesign_prompt}
{arch_hints}
Keep the room's structural layout, walls, windows, doors, ceiling height, and camera
angle/perspective exactly as in the original photo. Preserve the original direction
and quality of natural and ambient light — only add or adjust light sources the
redesign explicitly calls for. Only change furniture, decor, surface colors/materials,
and lighting fixtures.
{QUALITY_SUFFIX}"""

def build_refinement_prompt(user_instruction: str) -> str:
    user_instruction = sanitize_prompt(user_instruction)
    return f"""{user_instruction}
Apply this change only. Keep everything else in the image exactly as it is — same
furniture placement, same room structure, same lighting direction, same camera
angle — unless the instruction explicitly says otherwise.
{QUALITY_SUFFIX}"""
