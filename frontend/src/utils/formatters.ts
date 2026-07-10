/**
 * Converts internal style identifiers (e.g., modern_minimalist) 
 * to user-facing display names (e.g., Modern Minimalist).
 */
export function formatStyleName(style: string | null | undefined): string {
  if (!style) return 'Unknown Style';
  
  return style
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
