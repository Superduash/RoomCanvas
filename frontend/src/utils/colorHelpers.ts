/**
 * Color utilities for palette display
 */

// Common color name to hex mappings
const colorNameMap: Record<string, string> = {
  // Whites & Creams
  'pure white': '#FFFFFF',
  'alabaster white': '#F5F5F0',
  'pearl white': '#F8F8F8',
  'off white': '#FAF9F6',
  'cream': '#FFFDD0',
  'ivory': '#FFFFF0',
  
  // Grays & Blacks
  'warm charcoal': '#36454F',
  'mist grey': '#D3D3D3',
  'soft beige': '#F5F5DC',
  'weathered grey': '#9A9A9A',
  'deep obsidian': '#0B0B0B',
  'matte black': '#28282B',
  'raw iron black': '#1C1C1C',
  
  // Browns & Earthy
  'pale ash oak': '#C9B899',
  'warm terracotta': '#E07856',
  'burnt orange': '#CC5500',
  'brick red': '#B22222',
  'copper accents': '#B87333',
  
  // Greens
  'sage green accents': '#9CAF88',
  'sage green': '#9CAF88',
  'olive green': '#808000',
  'rich emerald': '#50C878',
  
  // Golds & Yellows
  'champagne gold': '#F7E7CE',
  'mustard yellow': '#FFDB58',
  
  // Default fallback for unknown colors
  'unknown': '#CCCCCC',
};

/**
 * Converts a color (name or hex) to a valid hex code
 */
export function toHexColor(color: string): string {
  // Already a hex code
  if (color.startsWith('#')) {
    return color.toUpperCase();
  }
  
  // Look up color name (case-insensitive)
  const normalized = color.toLowerCase().trim();
  return colorNameMap[normalized] || '#808080'; // Default gray fallback
}

/**
 * Determines if a color needs a border (very light colors)
 */
export function needsColorBorder(hex: string): boolean {
  // Convert hex to RGB and calculate luminance
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.9; // Very light colors need a border
}

/**
 * Formats color name for display
 */
export function formatColorName(color: string): string {
  // If it's a hex code, return it as-is
  if (color.startsWith('#')) {
    return color.toUpperCase();
  }
  
  // Otherwise, title case the color name
  return color
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
