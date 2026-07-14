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

Additionally assess and report:
- "space_occupancy": one of "mostly_empty", "partially_furnished", "densely_furnished"
- "open_floor_area_pct": your best estimate of what % of the visible floor is currently unobstructed

Design it with the following style hint in mind: {style_hint}

Follow the requested JSON schema strictly. Ensure your redesign prompt describes exactly what to change in the image, using verbs like "change" rather than "transform".

For each furniture item, classify "purchase_status": use "keep_existing" for furniture already
visible in the original photo that the redesign keeps in place, "new_purchase" for anything the
user needs to buy, and "optional_upgrade" for nice-to-have additions that aren't essential to the
design. Give price_min and price_max as plain numbers in USD, not strings or ranges with symbols.
"""

def sanitize_prompt(text: str) -> str:
    """Sanitize user instruction: strip control characters, cap length to 2000, collapse whitespace."""
    text = "".join(ch for ch in text if ord(ch) >= 32)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()[:2000]

def estimate_tokens(text: str) -> int:
    return len(text.split()) * 1.3  # rough word-to-token estimate, good enough for a guardrail

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
- Balance & Symmetry: space fixtures symmetrically, mirror furniture where layout allows.
- Harmony: keep palette coherent with the requested style.
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

COMPOSITION_LOCK = """CRITICAL COMPOSITION RULES:
1. Keep the EXACT same camera angle, framing, and perspective as the original photo.
2. Do NOT reposition, resize, reflect, or rotate the room layout.
3. Preserve all structural elements: walls, windows, doors, ceiling, floor, and their positions.
4. CHANGE only what is explicitly instructed: furniture style, materials, colors, decorations,
   lighting fixtures — and, when explicitly instructed, complete removal of a specific object
   with the space behind it naturally reconstructed. Never change anything not explicitly requested.
5. Use the verb "change" - not "transform" or "redesign" - to signal precise targeted edits."""

REMOVAL_KEYWORDS = ["remove", "delete", "get rid of", "take out", "take away", "eliminate"]

def is_removal_instruction(instruction: str) -> bool:
    lowered = instruction.lower()
    return any(kw in lowered for kw in REMOVAL_KEYWORDS)

def build_removal_clause(instruction: str) -> str:
    return f"""{sanitize_prompt(instruction)}
Completely delete this object with no trace remaining — no outline, no shadow, no partial
shape, no residual object. Reconstruct the space it occupied by naturally extending the
surrounding floor, wall, and baseboard — matching the exact existing texture, tile pattern,
grout lines, wall color, and lighting of the adjacent area exactly, as if the object was
never there. Do not introduce any new object, furniture, or shape to fill the space unless
explicitly instructed to."""

def build_full_prompt(base_prompt: str, customization=None, instruction: str | None = None) -> str:
    parts = [base_prompt]
    parts.append(QUALITY_SUFFIX)
    
    custom_clause = build_customization_clause(customization)
    if custom_clause:
        parts.append(custom_clause)
        
    if instruction:
        instruction_lower = instruction.lower()
        is_removal = is_removal_instruction(instruction)
        
        # Conflict detection
        if customization:
            import logging
            logger = logging.getLogger(__name__)
            if getattr(customization, "must_have_furniture", None):
                for item in customization.must_have_furniture:
                    if item.lower() in instruction_lower and is_removal:
                        logger.warning(f"Prompt Conflict Detected: Instruction asks to remove, but '{item}' is in must_have_furniture.")
            if getattr(customization, "avoid", None):
                for item in customization.avoid:
                    if item.lower() in instruction_lower and not is_removal:
                        logger.warning(f"Prompt Conflict Detected: Instruction mentions '{item}', but it is in avoid list.")

        if is_removal:
            parts.append(build_removal_clause(instruction))
        else:
            parts.append(f"CRITICAL USER INSTRUCTION (OVERRIDES ALL PREVIOUS STYLE AND LAYOUT GUIDANCE):\n{sanitize_prompt(instruction)}")
        
    final = "\n\n".join(p for p in parts if p)
    if estimate_tokens(final) > 480:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Assembled prompt ~{estimate_tokens(final):.0f} tokens — near Kontext's 512 limit, may truncate.")
    return final



def get_space_guidance(analysis_data: dict = None) -> str:
    occupancy = (analysis_data or {}).get("space_occupancy", "mostly_empty")
    open_pct = (analysis_data or {}).get("open_floor_area_pct", 100)

    if occupancy == "densely_furnished" or open_pct < 25:
        return (
            "This room has very little open floor space and is already densely furnished. "
            "Do NOT add large new furniture (no new sofas, cupboards, wardrobes, dining sets, or beds). "
            "Restyle what already exists in place: update colors, materials, and finishes on the existing "
            "furniture pieces exactly where they currently sit. Where there is genuinely open space "
            "(a corner, a windowsill, a small gap), you may add only small-footprint items — a side table, "
            "a floor lamp, a small plant, an accent chair, wall art, a rug in the open area only. "
            "Never overlap new objects with existing furniture or walkways."
        )
    elif occupancy == "partially_furnished" or open_pct < 60:
        return (
            "This room is partially furnished. Keep existing large furniture in its current position "
            "and restyle it rather than replacing it outright unless the instructions say otherwise. "
            "Use the remaining open space for appropriately-scaled additions only."
        )
    return ""

def build_generation_prompt(gemini_redesign_prompt: str, analysis_data: dict = None, customization=None, is_regenerate=False, style_id=None, instruction: str | None = None) -> str:
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

    space_guidance = get_space_guidance(analysis_data)

    base_prompt = f"""{COMPOSITION_LOCK}

{gemini_redesign_prompt}

{arch_hints}
{space_guidance}
Change the furniture, decor, and finishes while preserving the room's walls, windows, doors, and camera framing exactly as shown. Preserve the original direction and quality of natural and ambient light — only add or adjust light sources the redesign explicitly calls for. Only change furniture, decor, surface colors/materials, and lighting fixtures."""

    # We manually inject the variation descriptors into customization or instruction if needed
    if is_regenerate and style_id:
        variation_desc = pick_variation_descriptors(style_id)
        if variation_desc:
            # Append it to the base_prompt
            base_prompt += f"\n{variation_desc}"
            
    return build_full_prompt(base_prompt, customization, instruction)

def build_refinement_prompt(user_instruction: str | None, customization=None, analysis_data: dict = None) -> str:
    space_guidance = get_space_guidance(analysis_data)

    base_prompt = f"""{COMPOSITION_LOCK}

{space_guidance}
Apply this change only. Keep everything else in the image exactly as it is — same furniture placement, same room structure, same lighting direction, same camera angle — unless the instruction explicitly says otherwise."""

    return build_full_prompt(base_prompt, customization, user_instruction)
