import { Hct, TonalPalette, argbFromHex, hexFromArgb } from "@material/material-color-utilities";
import { MATERIAL_TONE_STOPS } from "../shared/types";
import type { Ramp, Swatch } from "../shared/types";
import { buildSwatch } from "./swatch";

/**
 * Generates a true Material Design 3 tonal palette using Google's HCT color
 * space, labeled by tone (0-100) rather than Tailwind-style 50-950 steps.
 *
 * Unlike the Tailwind algorithm, the source hex is NOT forced onto one of
 * the standard stops verbatim — HCT preserves hue and chroma and computes
 * each tone's real sRGB value, so the source color's own tone is whatever
 * HCT determines it to be. If that tone doesn't land close to one of the
 * standard stops, it's included as an extra "Source" entry so the user's
 * literal input color is still present in the generated set.
 */
export function generateMaterialPalette(name: string, sourceHex: string): Ramp {
  const argb = argbFromHex(sourceHex);
  const sourceHct = Hct.fromInt(argb);
  const palette = TonalPalette.fromHueAndChroma(sourceHct.hue, sourceHct.chroma);

  const sourceTone = Math.round(sourceHct.tone);
  const nearestStandardStop = MATERIAL_TONE_STOPS.reduce((closest, stop) =>
    Math.abs(stop - sourceTone) < Math.abs(closest - sourceTone) ? stop : closest,
  );
  const sourceMatchesStandardStop = Math.abs(nearestStandardStop - sourceTone) <= 1.5;

  const stopsToRender: { tone: number; label: string; isSource: boolean }[] = MATERIAL_TONE_STOPS.map(
    (tone) => ({
      tone,
      label: `Tone ${tone}`,
      isSource: sourceMatchesStandardStop && tone === nearestStandardStop,
    }),
  );

  if (!sourceMatchesStandardStop) {
    stopsToRender.push({ tone: sourceTone, label: "Source", isSource: true });
  }
  // Always read light -> dark (tone 100 down to 0), matching the visual
  // convention of the Tailwind-style scale, regardless of whether a Source
  // entry was inserted above.
  stopsToRender.sort((a, b) => b.tone - a.tone);

  const swatches: Swatch[] = stopsToRender.map(({ tone, label, isSource }) => {
    const hex = hexFromArgb(palette.tone(tone));
    return buildSwatch(label, hex, isSource);
  });

  return { name, algorithm: "material-hct", sourceHex, swatches };
}
