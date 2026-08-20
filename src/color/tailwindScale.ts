import { converter, formatHex, clampChroma, wcagContrast } from "culori";
import { TAILWIND_STEPS } from "../shared/types";
import type { Ramp, Swatch } from "../shared/types";
import { buildSwatch } from "./swatch";

const toOklch = converter("oklch");

// Anchor lightness values for the top and bottom of the ramp. Not pure
// white/black — a "950" step that's actually #000000 loses all hue
// information and reads as broken in a design system, not "very dark blue".
const L_WHITE = 0.985;
const L_BLACK = 0.15;

const INDEX_OF_500 = TAILWIND_STEPS.indexOf(500);

/** Smoothstep easing so steps compress slightly near the anchor, matching
 * how hand-tuned scales (Tailwind, Radix) feel rather than a flat linear
 * ramp. */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Generates the 11-step Tailwind/Radix-style scale for a single brand
 * color. Step 500 is guaranteed to equal the input hex exactly (not just
 * approximately, which a naive OKLCH round-trip can drift on).
 */
export function generateTailwindScale(name: string, sourceHex: string): Ramp {
  const source = toOklch(sourceHex);
  if (!source) {
    throw new Error(`"${sourceHex}" is not a valid color.`);
  }

  const swatches: Swatch[] = TAILWIND_STEPS.map((step, i) => {
    if (i === INDEX_OF_500) {
      return buildSwatch(String(step), sourceHex, true);
    }

    const towardWhite = i < INDEX_OF_500;
    const span = INDEX_OF_500;
    const t = towardWhite ? i / span : (i - INDEX_OF_500) / (TAILWIND_STEPS.length - 1 - INDEX_OF_500);
    const eased = smoothstep(t);

    const targetL = towardWhite
      ? lerp(L_WHITE, source.l ?? 0.5, eased)
      : lerp(source.l ?? 0.5, L_BLACK, eased);

    // Keep hue/chroma from the source, then pull chroma back into the sRGB
    // gamut at this lightness. This is what keeps very light/dark steps
    // from clipping into a dull, desaturated color.
    const clamped = clampChroma(
      { mode: "oklch", l: targetL, c: source.c ?? 0, h: source.h ?? 0 },
      "oklch",
    );

    const hex = formatHex(clamped);
    return buildSwatch(String(step), hex, false);
  });

  return { name, algorithm: "tailwind-oklch", sourceHex, swatches };
}

export { wcagContrast };
