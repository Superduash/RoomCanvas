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
- Approximate room shape (rectangular, L-shaped, irregular, etc.)
- Any visible reference objects and their typical real-world size (e.g. standard door ≈ 2032mm tall)
- Estimated ceiling height band (8ft, 9ft, 10ft+)

Design it with the following style hint in mind: {style_hint}

Follow the requested JSON schema strictly. Ensure your redesign prompt describes exactly what to change in the image, using verbs like "change" rather than "transform".
"""

def sanitize_prompt(text: str) -> str:
    """Sanitize user instruction: strip control characters, cap length to 2000, collapse whitespace."""
    text = "".join(ch for ch in text if ord(ch) >= 32)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()[:2000]

def get_analysis_prompt(style_id: str) -> str:
    style_info = STYLE_TEMPLATES.get(style_id)
    if style_info:
        style_hint = f"Style: {style_id}. Focus on: {', '.join(style_info['furniture'])}. Colors: {', '.join(style_info['palette'])}."
    else:
        style_hint = style_id

    return ANALYSIS_PROMPT_V1.format(style_hint=style_hint)

def pick_variation_descriptors(style_id: str) -> str:
    import random
    from app.ai.prompts.style_hints import STYLE_VARIATION_POOLS
    pools = STYLE_VARIATION_POOLS.get(style_id, {})
    if not pools:
        return ""
    chosen = {k: random.choice(v) for k, v in pools.items()}
    return f"Incorporate {chosen.get('accent_materials', '')} accents, {chosen.get('focal_points', '')} as the focal point, and {chosen.get('textile_moods', '')}."

DESIGN_PRINCIPLES = """
Apply professional interior design principles:
- Balance: distribute visual weight evenly. If ceiling or wall light fixtures are used, space them symmetrically and evenly across the ceiling/wall — never asymmetric or unevenly clustered. Mirror furniture placement around a central axis where the room layout allows.
- Scale and proportion: furniture must be sized appropriately for the room's real dimensions.
- Rhythm: repeat 2-3 colors, materials, or shapes across the room.
- Emphasis: establish exactly one clear focal point.
- Contrast: pair at least one light surface against one dark surface, and one smooth material against one textured material.
- Harmony: keep the full palette and material selection coherent with the requested style.
- Details: include finishing touches appropriate to the style.
Follow the 60-30-10 color rule: roughly 60% dominant wall/floor tone, 30% secondary furniture/textile tone, 10% accent color in small decor items. Keep furniture pulled slightly away from walls rather than pressed flat against them. If a rug is used, size it so at least the front legs of major seating rest on it. Hang any wall art so its visual center sits at roughly average eye level relative to the floor.
"""

QUALITY_SUFFIX = """
Target architectural visualization quality comparable to professional real-estate renders.

Prioritize:
- architectural accuracy
- furniture proportion
- material realism
- lighting realism
- preservation of room geometry
- premium interior styling
- consistency with the requested design language

If a tradeoff exists, always preserve the original room architecture over adding additional decorative elements.
""" + DESIGN_PRINCIPLES

def build_customization_clause(c) -> str:
    if c is None:
        return ""
    parts = []
    # Hard constraints first
    if c.avoid:
        parts.append(f"Avoid the following entirely: {', '.join(c.avoid)}.")
    if c.must_have_furniture:
        parts.append(f"The design must include: {', '.join(c.must_have_furniture)}.")
    if c.room_width_ft and c.room_length_ft:
        parts.append(f"The actual room is approximately {c.room_width_ft} by {c.room_length_ft} feet — scale furniture proportionally to this real size.")
    # Softer constraints after
    if c.color_preference:
        parts.append(f"Favor a color palette centered on {c.color_preference}.")
    if c.budget_tier:
        parts.append(f"Select furniture and materials appropriate for a {c.budget_tier.lower()} budget.")
    if c.lighting_preference:
        parts.append(f"Use {c.lighting_preference.lower()} lighting throughout.")
    return " ".join(parts)

COMPOSITION_LOCK = "Keep the exact same camera angle, framing, and perspective as the original photo. Do not reposition, resize, or reflect the room."

def build_generation_prompt(gemini_redesign_prompt: str, analysis_data: dict = None, customization=None, is_regenerate=False, style_id=None) -> str:
    gemini_redesign_prompt = sanitize_prompt(gemini_redesign_prompt)
    
    # Swap 'transform' with 'change' for better layout retention
    gemini_redesign_prompt = re.sub(r'\btransform\b', 'change', gemini_redesign_prompt, flags=re.IGNORECASE)
    
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

    custom_clause = build_customization_clause(customization)
    
    if is_regenerate and style_id:
        variation_desc = pick_variation_descriptors(style_id)
        if variation_desc:
            custom_clause = (custom_clause + "\n" + variation_desc).strip()

    if custom_clause:
        custom_clause = f"\n{custom_clause}"

    return f"""{COMPOSITION_LOCK}

{gemini_redesign_prompt}

{arch_hints}
Change the furniture, decor, and finishes while preserving the room's walls, windows, doors, and camera framing exactly as shown. Preserve the original direction and quality of natural and ambient light — only add or adjust light sources the redesign explicitly calls for. Only change furniture, decor, surface colors/materials, and lighting fixtures.{custom_clause}
{QUALITY_SUFFIX}"""

def build_refinement_prompt(user_instruction: str) -> str:
    user_instruction = sanitize_prompt(user_instruction)
    return f"""{COMPOSITION_LOCK}

{user_instruction}
Apply this change only. Keep everything else in the image exactly as it is — same furniture placement, same room structure, same lighting direction, same camera angle — unless the instruction explicitly says otherwise.
{QUALITY_SUFFIX}"""
