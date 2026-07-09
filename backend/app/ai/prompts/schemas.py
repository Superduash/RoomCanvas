"""
JSON Schema definitions for Gemini structured outputs.
"""

ANALYSIS_RESPONSE_SCHEMA = {
    "type": "object",
    "required": ["room_type", "furniture", "estimated_dimensions", "layout_notes",
                 "color_palette", "lighting_suggestions", "estimated_budget_range",
                 "style_explanation", "redesign_prompt"],
    "properties": {
        "room_type": {"type": "string"},
        "furniture": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["item", "description", "estimated_price_range"],
                "properties": {
                    "item": {"type": "string"},
                    "description": {"type": "string"},
                    "estimated_price_range": {"type": "string"}
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
        "estimated_budget_range": {"type": "string"},
        "style_explanation": {"type": "string"},
        "redesign_prompt": {"type": "string"}
    }
}
