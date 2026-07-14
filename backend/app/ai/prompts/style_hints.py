STYLE_TEMPLATES = {
    "modern_minimalist": {
        "furniture": [
            "Low-profile platform sofa with hidden supports",
            "Monolithic concrete or stone coffee table",
            "Handleless matte-finish storage cabinets",
            "Recessed track lighting with slim spotlights"
        ],
        "palette": ["Pure White", "Warm Charcoal", "Soft Beige", "Matte Black"],
        "budget_tag": "Mid",
        "reason_template": "Focuses on clean lines, simplicity, and functionality by eliminating unnecessary clutter, creating a calm and open atmosphere in your {room_type} while using a monochromatic backdrop."
    },
    "scandinavian": {
        "furniture": [
            "Light oak tapered-leg side tables",
            "Woven wool lounge chair in cream or soft beige",
            "Floating wood shelves with concealed mounting",
            "Minimalist opal glass pendant lighting"
        ],
        "palette": ["Alabaster White", "Pale Ash Oak", "Mist Grey", "Sage Green accents"],
        "budget_tag": "Budget",
        "reason_template": "Emphasizes natural light, organic textures, and functional simplicity. The warm wood tones and soft accents introduce a cozy feeling of 'hygge' into your {room_type} without sacrificing space."
    },
    "industrial": {
        "furniture": [
            "Distressed leather clean-lined sofa",
            "Reclaimed wood and steel coffee table",
            "Black iron piping wall shelving units",
            "Exposed filament Edison bulb light fixtures"
        ],
        "palette": ["Raw Iron Black", "Brick Red", "Weathered Grey", "Copper accents"],
        "budget_tag": "Mid",
        "reason_template": "Celebrates raw materials and architectural features like structural steel and exposed piping, giving your {room_type} a bold, warehouse-like aesthetic filled with texture and history."
    },
    "bohemian": {
        "furniture": [
            "Rattan or wicker peacock accent chair",
            "Plush low-to-the-ground floor pillows and poufs",
            "Layered distressed vintage Persian rugs",
            "Macramé wall hangings and hanging plant holders"
        ],
        "palette": ["Warm Terracotta", "Mustard Yellow", "Olive Green", "Burnt Orange"],
        "budget_tag": "Budget",
        "reason_template": "Embraces a carefree, layered, and eclectically styled environment. It integrates rich textiles, global patterns, and vibrant plant life, creating a highly personal and warm {room_type}."
    },
    "luxury_contemporary": {
        "furniture": [
            "Velvet upholstered custom sofa with brass plinth",
            "Polished Calacatta marble console table",
            "Bespoke geometric crystal chandelier",
            "Polished gold or brass metal frame accent chairs"
        ],
        "palette": ["Champagne Gold", "Rich Emerald", "Pearl White", "Deep Obsidian"],
        "budget_tag": "Premium",
        "reason_template": "Merges high-end materials, sophisticated textures, and custom-made statements. It delivers an elegant, refined aesthetic that exudes luxury while preserving the comfort and utility of your {room_type}."
    }
}

ADDITIONAL_STYLES = [
    {
        "id": "indian_contemporary",
        "furniture": ["low-profile teak wood sofa", "brass-inlay coffee table", "hand-block-print cushions", "jali-pattern room divider"],
        "palette": ["#8B4513", "#D4AF37", "#F5F0E6", "#2E5339"],
        "budget_tag": "Mid-Range",
        "reason_template": "A {room_type} that blends contemporary form with traditional Indian craft details — brass accents, block-print textiles, and warm wood tones.",
    },
    {
        "id": "japandi",
        "furniture": ["low platform bed or seating", "natural oak furniture", "paper/rice-weave lighting", "minimal ceramic decor"],
        "palette": ["#E8E2D5", "#4A4238", "#B8A88A", "#1C1C1C"],
        "budget_tag": "Mid-Range",
        "reason_template": "A {room_type} combining Japanese minimalism with Scandinavian warmth — natural materials, low furniture, and quiet, uncluttered lines.",
    },
    {
        "id": "mediterranean",
        "furniture": ["wrought-iron accents", "terracotta planters", "linen upholstered seating", "carved wood console"],
        "palette": ["#F2E9D8", "#3B6E8F", "#C97C4A", "#7A8B69"],
        "budget_tag": "Mid-Range",
        "reason_template": "A sun-washed {room_type} inspired by coastal Mediterranean homes — terracotta, whitewashed textures, and warm blue accents.",
    },
    {
        "id": "traditional_indian_heritage",
        "furniture": ["hand-carved wooden furniture", "jaali screens", "brass lanterns", "rich jewel-tone textiles"],
        "palette": ["#7B1E3A", "#D4AF37", "#1B4332", "#F4E9CD"],
        "budget_tag": "Premium",
        "reason_template": "A {room_type} rooted in traditional Indian heritage design — carved wood, brass detailing, and rich jewel-toned textiles.",
    },
    {
        "id": "coastal",
        "furniture": ["woven rattan chairs", "light driftwood tones", "linen slipcovers", "nautical-inspired accents"],
        "palette": ["#F7F5F0", "#A8C5D6", "#E8DCC8", "#2C3E50"],
        "budget_tag": "Budget-Friendly",
        "reason_template": "A breezy, light-filled {room_type} with coastal textures — rattan, driftwood tones, and soft ocean-inspired color.",
    },
]

STYLE_VARIATION_POOLS = {
    "modern_minimalist": {
        "accent_materials": ["brushed brass", "matte black steel", "warm oak", "polished chrome", "honed concrete"],
        "focal_points": ["a sculptural pendant light", "a large abstract canvas", "a statement bookshelf wall", "a low-profile fireplace", "a monolithic stone table"],
        "textile_moods": ["neutral linen textures", "soft bouclé accents", "subtle geometric-pattern textiles", "crisp cotton", "monochromatic wool"],
    },
    "scandinavian": {
        "accent_materials": ["ash wood", "matte ceramic", "black iron details", "pale birch", "frosted glass"],
        "focal_points": ["a minimal woven rug", "an oversized paper lantern", "a gallery wall of line art", "a sleek wood-burning stove", "a large potted ficus tree"],
        "textile_moods": ["chunky knit throws", "soft muted cottons", "natural sheepskin textures", "faded pastel linen", "woven wool blends"],
    },
    "industrial": {
        "accent_materials": ["exposed brick", "aged copper", "concrete elements", "corrugated metal", "blackened steel"],
        "focal_points": ["a large factory-style window", "a distressed leather anchor piece", "industrial pipe shelving", "a vintage gear-based clock", "a salvaged wood coffee table"],
        "textile_moods": ["heavy canvas", "dark neutral wools", "vintage leather", "faded denim textures", "rough burlap accents"],
    },
    "bohemian": {
        "accent_materials": ["rattan", "macrame", "hammered brass", "colored glass", "reclaimed painted wood"],
        "focal_points": ["a vibrant patterned rug", "a cluster of hanging plants", "a vintage carved room divider", "a floor cushion lounge area", "a woven peacock chair"],
        "textile_moods": ["rich velvet", "embroidered cotton", "layered kilim patterns", "fringed throws", "block-printed fabrics"],
    },
    "luxury_contemporary": {
        "accent_materials": ["polished marble", "gold leaf", "smoked glass", "burl wood", "brushed champagne bronze"],
        "focal_points": ["a bespoke crystal chandelier", "a sleek marble fireplace", "a large metallic abstract art piece", "a curved velvet sectional", "a high-gloss lacquered cabinet"],
        "textile_moods": ["silk drapery", "plush velvet", "high-gloss leather", "cashmere throws", "metallic thread accents"],
    },
    "indian_contemporary": {
        "accent_materials": ["polished brass", "carved teak", "terracotta", "oxidized copper", "cane webbing"],
        "focal_points": ["a jali-patterned accent wall", "a brass Urli bowl with floating flowers", "a low carved daybed", "a collection of vintage brass pots", "an intricately carved wood panel"],
        "textile_moods": ["block-printed cottons", "silk blend cushions", "warm earthy linens", "ikat patterns", "hand-loomed khadi"],
    },
    "japandi": {
        "accent_materials": ["bamboo", "wabi-sabi ceramics", "paper lanterns", "light walnut", "black slate"],
        "focal_points": ["a minimal bonsai arrangement", "a low slatted wood screen", "a Zen-inspired rock element", "a simple oversized ceramic vase", "a Noguchi-style paper lamp"],
        "textile_moods": ["unbleached linen", "soft tatami textures", "quiet neutral cottons", "hemp fabric", "textured slub cotton"],
    },
    "mediterranean": {
        "accent_materials": ["wrought iron", "painted ceramic tiles", "limewash walls", "rustic pine", "copper cookware"],
        "focal_points": ["an arched alcove", "a large terracotta olive jar", "a rustic wooden beam ceiling", "a tiled mosaic focal wall", "a traditional stone hearth"],
        "textile_moods": ["breezy white linen", "sun-faded cotton", "woven sea-grass", "striped Turkish cotton", "textured gauze"],
    },
    "traditional_indian_heritage": {
        "accent_materials": ["antique brass", "dark rosewood", "intricate inlay work", "silver repoussé", "hand-painted woodwork"],
        "focal_points": ["a majestic carved archway", "a cluster of hanging brass diyas", "a traditional swing (jhoola)", "a grand four-poster wooden bed", "a detailed Pichwai painting"],
        "textile_moods": ["rich brocade", "hand-woven silk", "vibrant jewel-toned velvets", "zari embroidered cushions", "heavy damask weaves"],
    },
    "coastal": {
        "accent_materials": ["driftwood", "sea glass", "woven seagrass", "whitewashed oak", "polished nickel"],
        "focal_points": ["a large nautical-inspired pendant", "a collection of coastal photography", "a light washed-wood console", "a woven jute rug", "a coral or shell display"],
        "textile_moods": ["striped cotton", "light airy linen", "soft blue-toned textiles", "nautical rope textures", "crisp white canvas"],
    },
}
