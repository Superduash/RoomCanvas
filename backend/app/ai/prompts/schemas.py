"""
JSON Schema definitions for Gemini structured outputs.
"""

ANALYSIS_RESPONSE_SCHEMA = {
    "type": "object",
    "required": ["room_type", "architecture", "furniture_placement", "furniture", "estimated_dimensions", "layout_notes",
                 "color_palette", "lighting_suggestions",
                 "style_explanation", "redesign_prompt", "design_rationale", "space_occupancy", "open_floor_area_pct"],
    "properties": {
        "space_occupancy": {"type": "string", "enum": ["mostly_empty", "partially_furnished", "densely_furnished"]},
        "open_floor_area_pct": {"type": "number"},
        "room_type": {"type": "string"},
        "architecture": {
            "type": "object",
            "required": ["walls", "windows", "doors", "ceiling_height", "lighting_direction"],
            "properties": {
                "walls": {"type": "string"},
                "windows": {"type": "string"},
                "doors": {"type": "string"},
                "ceiling_height": {"type": "string"},
                "lighting_direction": {"type": "string"}
            }
        },
        "furniture_placement": {"type": "string"},
        "furniture": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["item", "description", "price_min", "price_max", "purchase_status"],
                "properties": {
                    "item": {"type": "string"},
                    "description": {"type": "string"},
                    "price_min": {"type": "number"},
                    "price_max": {"type": "number"},
                    "purchase_status": {"type": "string", "enum": ["new_purchase", "keep_existing", "optional_upgrade"]},
                    "dimensions": {"type": "string"},
                    "confidence": {"type": "string", "enum": ["Low", "Medium", "High"]}
                }
            }
        },
        "estimated_dimensions": {
            "type": "object",
            "required": ["width_ft", "length_ft", "confidence"],
            "properties": {
                "width_ft": {"type": "number"},
                "length_ft": {"type": "number"},
                "confidence": {"type": "string", "enum": ["low", "medium", "high"]}
            }
        },
        "layout_notes": {"type": "string"},
        "color_palette": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["name", "hex"],
                "properties": {"name": {"type": "string"}, "hex": {"type": "string"}}
            }
        },
        "lighting_suggestions": {"type": "string"},
        "style_explanation": {"type": "string"},
        "redesign_prompt": {"type": "string"},
        "design_rationale": {
            "type": "object",
            "required": ["overview", "observations", "watch_out"],
            "properties": {
                "overview": {"type": "string"},
                "observations": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "watch_out": {"type": "string"}
            }
        }
    }
}
