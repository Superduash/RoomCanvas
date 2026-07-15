import re
from app.ai.prompts.style_hints import STYLE_TEMPLATES

CURRENT_ANALYSIS_PROMPT_VERSION = "v1"

ANALYSIS_PROMPT_V1 = """
You are an expert interior designer. Analyze the provided room photo and return a structured JSON response.

ARCHITECTURAL ELEMENTS
These MUST remain. Detect and document:
- walls
- windows
- doors
- pillars
- ceiling
- flooring
- permanent cabinetry
- built-in wardrobes
- stairs
- fireplaces
- Primary lighting direction (natural and artificial)
- Approximate room shape (rectangular, L-shaped, irregular, etc.)

MOVABLE OBJECTS
Anything NOT permanently attached MUST be considered removable.
Examples: beds, chairs, tables, desks, laptops, TVs, plants, boxes, clothes, bags, curtains, wall decor, carpets, toys, books, fans, electronics, wires, mirrors, storage bins.
Treat these as clutter if they conflict with the requested redesign.

Carefully categorize objects in the room:
1. `movable_objects`: list all movable items here.
2. `built_in_objects`: list all permanent built-in items here.
3. `furniture`: (legacy compatibility - you may leave this empty).

Additionally assess and report:
- "analysis_confidence": a float between 0.0 and 1.0 indicating how clearly you can see and map the room's details. If the image is blurry, poorly lit, or a confusing angle, lower this score.
- "space_occupancy": one of "mostly_empty", "partially_furnished", "densely_furnished"
- "open_floor_area_pct": your best estimate of what % of the visible floor is currently unobstructed

Design it with the following style hint in mind: {style_hint}

Follow the requested JSON schema strictly. Ensure your redesign prompt describes exactly what to change in the image.

For each object, classify "purchase_status": use "keep_existing" for items already visible that the redesign keeps, "new_purchase" for anything the user needs to buy, and "optional_upgrade" for nice-to-have additions. Give price_min and price_max as plain numbers in USD.
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

COMPOSITION_LOCK_V1 = """CRITICAL COMPOSITION RULES:
You are NOT decorating an existing room. You are performing a complete interior renovation.

OBJECT REMOVAL PHASE
1. Keep the EXACT same camera angle, framing, and perspective as the original photo.
2. Preserve all structural elements: walls, windows, doors, ceiling, floor, and their positions.
3. Delete every movable object.
4. Repair every occluded wall.
5. Repair every hidden floor region.
6. Repair lighting, shadows, and reflections.
7. Only permanent architecture remains.

DESIGN PHASE
1. Design the room from scratch.
2. Completely replace furniture.
3. Do not reuse existing furniture (unless built-in or explicitly requested).
4. Do not preserve clutter.
5. Do not blend new furniture with old furniture.
6. The final image should appear as if the original furniture never existed."""

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
    removal_hints = ""
    if analysis_data:
        if "architecture" in analysis_data:
            arch = analysis_data["architecture"]
            arch_hints = (
                f"Preserve the existing room structure exactly: "
                f"Walls ({arch.get('walls', 'keep as is')}), "
                f"Windows ({arch.get('windows', 'keep as is')}), "
                f"Doors ({arch.get('doors', 'keep as is')}), "
                f"Ceiling height ({arch.get('ceiling_height', 'keep as is')}). "
                f"Preserve the original lighting direction ({arch.get('lighting_direction', 'keep original')}). "
            )
            
        if "movable_objects" in analysis_data and analysis_data["movable_objects"]:
            movables = [obj["item"] for obj in analysis_data["movable_objects"]]
            removal_hints = f"Before redesigning, completely REMOVE these existing movable objects and clutter: {', '.join(movables)}. Reconstruct the space they occupied naturally. Do NOT just decorate around them."

    space_guidance = get_space_guidance(analysis_data)

    GENERATION_PROMPT_V1 = f"""{COMPOSITION_LOCK_V1}

Before generating the redesign:
FIRST completely remove every movable object.
Reconstruct the floor, wall, lighting, and background naturally.
Only after the room is completely empty, design the room from scratch.

{gemini_redesign_prompt}

{arch_hints}
{removal_hints}
{space_guidance}
Change the furniture, decor, and finishes while preserving the room's walls, windows, doors, and camera framing exactly as shown. Preserve the original direction and quality of natural and ambient light — only add or adjust light sources the redesign explicitly calls for."""

    # We manually inject the variation descriptors into customization or instruction if needed
    if is_regenerate and style_id:
        variation_desc = pick_variation_descriptors(style_id)
        if variation_desc:
            base_prompt = f"{GENERATION_PROMPT_V1}\n{variation_desc}"
            return build_full_prompt(base_prompt, customization, instruction)
            
    return build_full_prompt(GENERATION_PROMPT_V1, customization, instruction)

def build_refinement_prompt(user_instruction: str | None, customization=None, analysis_data: dict = None) -> str:
    space_guidance = get_space_guidance(analysis_data)

    base_prompt = f"""{COMPOSITION_LOCK_V1}

{space_guidance}
Apply this change only. Keep everything else in the image exactly as it is — same furniture placement, same room structure, same lighting direction, same camera angle — unless the instruction explicitly says otherwise."""

    return build_full_prompt(base_prompt, customization, user_instruction)
