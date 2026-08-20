import { clampChroma, formatHex } from "culori";

// A fixed, vivid reference lightness/chroma for the wheel's ring — not
// derived from the user's brand color. A color wheel's ring is a reference
// backdrop (like a wall-mounted color wheel poster), not a rendering of any
// particular color; using the brand color's own lightness would make the
// ring look washed out or overly dark depending on what was pasted in.
// Chroma is requested high (0.35, well outside sRGB at most hues) and then
// gamut-clamped per hue, so the ring is exactly as saturated as each hue
// can actually go — not an arbitrary flat value.
const RING_LIGHTNESS = 0.75;
const REQUESTED_CHROMA = 0.35;

/** Returns `steps` hex colors evenly spaced around the hue circle (0-360°)
 * at a fixed vivid lightness, gamut-clamped per hue. Used to build the
 * wheel's conic-gradient ring. */
export function generateWheelRingStops(steps: number): string[] {
  const stops: string[] = [];
  for (let i = 0; i < steps; i++) {
    const hue = (i / steps) * 360;
    const clamped = clampChroma({ mode: "oklch", l: RING_LIGHTNESS, c: REQUESTED_CHROMA, h: hue }, "oklch");
    stops.push(formatHex(clamped));
  }
  return stops;
}
