import { converter, formatHex, clampChroma } from "culori";

const toOklch = converter("oklch");

export type HarmonyScheme =
  | "complementary"
  | "split-complementary"
  | "analogous"
  | "triadic"
  | "tetradic"
  | "square"
  | "monochromatic";

export interface HarmonySchemeInfo {
  value: HarmonyScheme;
  label: string;
  description: string;
}

export const HARMONY_SCHEMES: HarmonySchemeInfo[] = [
  {
    value: "complementary",
    label: "Complementary",
    description: "The color directly opposite on the wheel (180°). High contrast, classic accent pairing.",
  },
  {
    value: "split-complementary",
    label: "Split-complementary",
    description: "The two colors flanking the complement (150° / 210°). Same contrast, softer than a straight complement.",
  },
  {
    value: "analogous",
    label: "Analogous",
    description: "Neighbors on the wheel (±30°). Low contrast, naturally cohesive — good for backgrounds and supporting UI.",
  },
  {
    value: "triadic",
    label: "Triadic",
    description: "Three colors evenly spaced (120° apart). Vibrant and balanced, common for playful brand palettes.",
  },
  {
    value: "tetradic",
    label: "Tetradic",
    description: "Two complementary pairs, unevenly spaced (a rectangle, not a square). More range than square, still has a natural dominant/accent pairing.",
  },
  {
    value: "square",
    label: "Square",
    description: "Four colors evenly spaced (90° apart). The most colors at once — use one as dominant, the rest as accents.",
  },
  {
    value: "monochromatic",
    label: "Monochromatic",
    description: "Same hue, lighter and darker steps only. No hue variation — safest option, guaranteed to feel cohesive.",
  },
];

export interface HarmonyColor {
  role: string;
  hex: string;
  /** Absolute hue in degrees (0-360), for positioning on the wheel. */
  hue: number;
  isBase: boolean;
}

interface HueOffset {
  role: string;
  offset: number;
}

const OFFSETS_BY_SCHEME: Partial<Record<HarmonyScheme, HueOffset[]>> = {
  complementary: [
    { role: "Base", offset: 0 },
    { role: "Complementary", offset: 180 },
  ],
  "split-complementary": [
    { role: "Base", offset: 0 },
    { role: "Split A", offset: 150 },
    { role: "Split B", offset: 210 },
  ],
  analogous: [
    { role: "Analogous A", offset: -30 },
    { role: "Base", offset: 0 },
    { role: "Analogous B", offset: 30 },
  ],
  triadic: [
    { role: "Base", offset: 0 },
    { role: "Triadic A", offset: 120 },
    { role: "Triadic B", offset: 240 },
  ],
  // Two complementary pairs, unevenly spaced (60°/120° gaps) — a
  // rectangle when connected, distinct from Square below where all four
  // gaps are equal.
  tetradic: [
    { role: "Base", offset: 0 },
    { role: "Tetradic A", offset: 60 },
    { role: "Tetradic B", offset: 180 },
    { role: "Tetradic C", offset: 240 },
  ],
  square: [
    { role: "Base", offset: 0 },
    { role: "Square A", offset: 90 },
    { role: "Square B", offset: 180 },
    { role: "Square C", offset: 270 },
  ],
};

// Monochromatic varies lightness only — no hue offset — so it's handled
// separately from the angular schemes above rather than forced into the
// same offset shape.
const MONOCHROMATIC_LIGHTNESS_DELTAS: { role: string; delta: number }[] = [
  { role: "Darkest", delta: -0.3 },
  { role: "Dark", delta: -0.15 },
  { role: "Base", delta: 0 },
  { role: "Light", delta: 0.15 },
  { role: "Lightest", delta: 0.3 },
];

function normalizeHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

/**
 * Computes harmony colors for a base hex under the given scheme.
 *
 * Angular schemes rotate hue in OKLCH (not HSL) and hold lightness/chroma
 * from the source — consistent with the rest of this plugin's color math,
 * for the same reason: OKLCH hue rotation doesn't carry HSL's uneven
 * perceptual spacing (particularly around blue/purple).
 *
 * Monochromatic instead holds hue fixed and varies lightness — every
 * result shares the base's exact hue, which the caller (ColorWheelScreen)
 * uses to skip plotting overlapping wheel markers for this scheme.
 *
 * Chroma is re-clamped into the sRGB gamut for every result, since the
 * maximum in-gamut chroma at a given lightness varies by hue — without
 * this, some colors would be invalid or get silently desaturated by the
 * renderer.
 */
export function computeHarmony(baseHex: string, scheme: HarmonyScheme): HarmonyColor[] {
  const base = toOklch(baseHex);
  if (!base) {
    throw new Error(`"${baseHex}" is not a valid color.`);
  }
  const baseHue = base.h ?? 0;
  const baseL = base.l ?? 0.5;
  const baseC = base.c ?? 0;

  if (scheme === "monochromatic") {
    return MONOCHROMATIC_LIGHTNESS_DELTAS.map(({ role, delta }) => {
      const l = Math.min(0.97, Math.max(0.08, baseL + delta));
      const clamped = clampChroma({ mode: "oklch", l, c: baseC, h: baseHue }, "oklch");
      return { role, hex: formatHex(clamped), hue: normalizeHue(baseHue), isBase: delta === 0 };
    });
  }

  const offsets = OFFSETS_BY_SCHEME[scheme];
  if (!offsets) {
    throw new Error(`Unknown harmony scheme "${scheme}".`);
  }

  return offsets.map(({ role, offset }) => {
    const hue = normalizeHue(baseHue + offset);
    const clamped = clampChroma({ mode: "oklch", l: baseL, c: baseC, h: hue }, "oklch");
    return {
      role,
      hex: formatHex(clamped),
      hue,
      isBase: offset === 0,
    };
  });
}
