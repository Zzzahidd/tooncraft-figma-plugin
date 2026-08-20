import type { Ramp } from "../../shared/types";
import { hexToFigmaRgb } from "../hexToFigmaRgb";

/**
 * Creates one Paint Style per swatch, named "Design Tokens/Blue/50" etc. —
 * nested under the same collection name used for Variables, so both stay
 * organized under one shared group instead of drifting apart.
 *
 * Paint Styles have no concept of modes, so this always reflects whichever
 * mode's values were generated — it is not a dark-mode-aware output.
 * Variables (see createVariableCollection.ts) are the source of truth for
 * theming; this is a static mirror for teams still on the legacy styles
 * system. Regenerating the same group updates the existing styles in place.
 */
export async function createPaintStyles(
  collectionName: string,
  ramps: Ramp[],
  onProgress: (percent: number, label: string) => void,
): Promise<number> {
  const existing = await figma.getLocalPaintStylesAsync();
  const existingByName = new Map(existing.map((style) => [style.name, style]));

  let created = 0;
  const totalSwatches = ramps.reduce((sum, r) => sum + r.swatches.length, 0);

  for (const ramp of ramps) {
    for (const swatch of ramp.swatches) {
      const styleName = `${collectionName}/${ramp.name}/${swatch.step}`;
      const style = existingByName.get(styleName) ?? figma.createPaintStyle();
      style.name = styleName;
      style.paints = [{ type: "SOLID", color: hexToFigmaRgb(swatch.hex) }];

      created++;
      onProgress(Math.round((created / totalSwatches) * 100), `Creating style ${styleName}`);
      if (created % 25 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  return created;
}
