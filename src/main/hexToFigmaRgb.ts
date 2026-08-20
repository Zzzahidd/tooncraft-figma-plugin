/** Converts a "#rrggbb" hex string into Figma's 0-1 float RGB shape. */
export function hexToFigmaRgb(hex: string): RGB {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.substring(0, 2), 16) / 255;
  const g = parseInt(normalized.substring(2, 4), 16) / 255;
  const b = parseInt(normalized.substring(4, 6), 16) / 255;
  return { r, g, b };
}
