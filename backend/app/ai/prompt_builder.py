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
- Balance: distribute visual weight evenly. If ceiling or wall light fixtures are used,
  space them symmetrically and evenly across the ceiling/wall — never asymmetric or
  unevenly clustered. Mirror furniture placement around a central axis where the room
  layout allows.
- Scale and proportion: furniture must be sized appropriately for the room's real
  dimensions — a coffee table roughly two-thirds the width of the sofa it faces,
  seating that doesn't overwhelm or underfill the floor area.
- Rhythm: repeat 2-3 colors, materials, or shapes across the room (e.g. the same wood
  tone on two different furniture pieces) to create visual flow rather than a
  collection of unrelated objects.
- Emphasis: establish exactly one clear focal point (a feature wall, a statement
  light fixture, or an anchor furniture piece) that the rest of the room supports
  rather than competes with.
- Contrast: pair at least one light surface against one dark surface, and one smooth
  material against one textured material, to avoid a flat, monotonous look.
- Harmony: keep the full palette and material selection coherent with the requested
  style — no clashing colors or mismatched design eras.
- Details: include finishing touches appropriate to the style — hardware finishes,
  trim, small styling objects — not just large furniture.
Follow the 60-30-10 color rule: roughly 60% dominant wall/floor tone, 30% secondary
furniture/textile tone, 10% accent color in small decor items. Keep furniture pulled
slightly away from walls rather than pressed flat against them. If a rug is used, size
it so at least the front legs of major seating rest on it. Hang any wall art so its
visual center sits at roughly average eye level relative to the floor.
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
    if c.must_have_furniture:
        parts.append(f"The design must include: {', '.join(c.must_have_furniture)}.")
    if c.color_preference:
        parts.append(f"Favor a color palette centered on {c.color_preference}.")
    if c.budget_tier:
        parts.append(f"Select furniture and materials appropriate for a {c.budget_tier.lower()} budget.")
    if c.lighting_preference:
        parts.append(f"Use {c.lighting_preference.lower()} lighting throughout.")
    if c.room_width_ft and c.room_length_ft:
        parts.append(f"The actual room is approximately {c.room_width_ft} by {c.room_length_ft} feet — scale furniture proportionally to this real size.")
    if c.avoid:
        parts.append(f"Avoid the following entirely: {', '.join(c.avoid)}.")
    return " ".join(parts)

def build_generation_prompt(gemini_redesign_prompt: str, analysis_data: dict = None, customization=None, is_regenerate=False, style_id=None) -> str:
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

    custom_clause = build_customization_clause(customization)
    
    if is_regenerate and style_id:
        variation_desc = pick_variation_descriptors(style_id)
        if variation_desc:
            custom_clause = (custom_clause + "\n" + variation_desc).strip()

    if custom_clause:
        custom_clause = f"\n{custom_clause}"

    return f"""{gemini_redesign_prompt}
{arch_hints}
Keep the room's structural layout, walls, windows, doors, ceiling height, and camera
angle/perspective exactly as in the original photo. Preserve the original direction
and quality of natural and ambient light — only add or adjust light sources the
redesign explicitly calls for. Only change furniture, decor, surface colors/materials,
and lighting fixtures.{custom_clause}
{QUALITY_SUFFIX}"""

def build_refinement_prompt(user_instruction: str) -> str:
    user_instruction = sanitize_prompt(user_instruction)
    return f"""{user_instruction}
Apply this change only. Keep everything else in the image exactly as it is — same
furniture placement, same room structure, same lighting direction, same camera
angle — unless the instruction explicitly says otherwise.
{QUALITY_SUFFIX}"""
