import { roundToGrid, primaryBreakpoint } from "../../type/typeScale";
import type { TypeScaleResult } from "../../shared/types";

/**
 * Creates one Text Style per selected font style on each step, using its PRIMARY breakpoint's value
 * (Text Styles have no concept of modes, so — like Paint Styles for
 * color, and like the type variables' non-heading rows — this is a
 * single fixed value, not a responsive one). Named "Collection/Group/Name/Family Weight".
 *
 * Regenerating the same scale updates the existing styles in place, same
 * as Paint Styles for color.
 */
export async function createTextStyles(
  collectionName: string,
  scale: TypeScaleResult,
  onProgress: (percent: number, label: string) => void,
): Promise<number> {
  const fontsToLoad = new Map(scale.fonts.map((f) => [`${f.family}::${f.weight}`, f]));
  for (const font of fontsToLoad.values()) {
    await figma.loadFontAsync({ family: font.family, style: font.weight });
  }

  const existing = await figma.getLocalTextStylesAsync();
  const existingByName = new Map(existing.map((style) => [style.name, style]));

  const primary = primaryBreakpoint(scale.activeBreakpoints);
  let created = 0;

  const total = scale.steps.reduce((count, step) => count + step.fontStyles.length, 0);
  for (const step of scale.steps) {
    const value = step.category === "heading" ? step.byBreakpoint[primary] ?? step.single : step.single;

    for (const font of step.fontStyles) {
      const styleName = `${collectionName}/${step.group}/${step.name}/${font.family} ${font.weight}`;
      const style = existingByName.get(styleName) ?? figma.createTextStyle();
      style.name = styleName;
      style.fontName = { family: font.family, style: font.weight };
      style.fontSize = value.px;
      style.lineHeight = { value: roundToGrid(value.lineHeight * value.px, scale.gridSize), unit: "PIXELS" };
      style.letterSpacing = { value: 0, unit: "PERCENT" };

      created++;
      onProgress(Math.round((created / total) * 100), `Creating style ${styleName}`);
      if (created % 25 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  return created;
}
