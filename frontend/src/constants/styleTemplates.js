/**
 * STYLE_TEMPLATES — single source of truth for all design styles.
 * Used by ResultPage, StyleSelector, and any other UI consuming style metadata.
 * Keep in sync with backend/app/services/style_templates.py.
 */
export const STYLE_TEMPLATES = {
  modern_minimalist: {
    label: 'Modern Minimalist',
    emoji: '🏢',
    description: 'Clean lines, simple forms, and functional layout with monochromatic tones.',
    furniture: [
      'Low-profile platform sofa with hidden supports',
      'Monolithic concrete or stone coffee table',
      'Handleless matte-finish storage cabinets',
      'Recessed track lighting with slim spotlights',
    ],
    palette: ['Pure White', 'Warm Charcoal', 'Soft Beige', 'Matte Black'],
    budget_tag: 'Mid-Range',
    reason_template:
      'Focuses on clean lines, simplicity, and functionality by eliminating unnecessary clutter, creating a calm and open atmosphere in your {room_type} while using a monochromatic backdrop.',
  },
  scandinavian: {
    label: 'Scandinavian',
    emoji: '🌲',
    description: 'Cozy and warm hygge layout emphasising natural wood, white walls, and plants.',
    furniture: [
      'Light oak tapered-leg side tables',
      'Woven wool lounge chair in cream or soft beige',
      'Floating wood shelves with concealed mounting',
      'Minimalist opal glass pendant lighting',
    ],
    palette: ['Alabaster White', 'Pale Ash Oak', 'Mist Grey', 'Sage Green accents'],
    budget_tag: 'Budget-Friendly',
    reason_template:
      "Emphasises natural light, organic textures, and functional simplicity. The warm wood tones and soft accents introduce a cosy feeling of 'hygge' into your {room_type} without sacrificing space.",
  },
  industrial: {
    label: 'Industrial',
    emoji: '⚙️',
    description: 'Raw loft aesthetic pairing structural iron tubing with exposed bricks and leather.',
    furniture: [
      'Distressed leather clean-lined sofa',
      'Reclaimed wood and steel coffee table',
      'Black iron piping wall shelving units',
      'Exposed filament Edison bulb light fixtures',
    ],
    palette: ['Raw Iron Black', 'Brick Red', 'Weathered Grey', 'Copper accents'],
    budget_tag: 'Mid-Range',
    reason_template:
      'Celebrates raw materials and architectural features like structural steel and exposed piping, giving your {room_type} a bold, warehouse-like aesthetic filled with texture and history.',
  },
  bohemian: {
    label: 'Bohemian',
    emoji: '🌿',
    description: 'Eclectic artistic spaces highlighting rich textures, wicker chairs, and macramé.',
    furniture: [
      'Rattan or wicker peacock accent chair',
      'Plush low-to-the-ground floor pillows and poufs',
      'Layered distressed vintage Persian rugs',
      'Macramé wall hangings and hanging plant holders',
    ],
    palette: ['Warm Terracotta', 'Mustard Yellow', 'Olive Green', 'Burnt Orange'],
    budget_tag: 'Budget-Friendly',
    reason_template:
      'Embraces a carefree, layered, and eclectically styled environment. It integrates rich textiles, global patterns, and vibrant plant life, creating a highly personal and warm {room_type}.',
  },
  luxury_contemporary: {
    label: 'Luxury Contemporary',
    emoji: '💎',
    description: 'Premium textures featuring Calacatta marble, rich velvet, and brass lighting.',
    furniture: [
      'Velvet upholstered custom sofa with brass plinth',
      'Polished Calacatta marble console table',
      'Bespoke geometric crystal chandelier',
      'Polished gold or brass metal frame accent chairs',
    ],
    palette: ['Champagne Gold', 'Rich Emerald', 'Pearl White', 'Deep Obsidian'],
    budget_tag: 'Premium',
    reason_template:
      'Merges high-end materials, sophisticated textures, and custom-made statements. It delivers an elegant, refined aesthetic that exudes luxury while preserving the comfort and utility of your {room_type}.',
  },
}

export const STYLE_KEYS = Object.keys(STYLE_TEMPLATES)

/**
 * Returns a display label for any snake_case key string.
 */
export const formatLabel = (key) => {
  if (!key) return ''
  return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
