import { roundToGrid } from "../../type/typeScale";
import type { Breakpoint, TypeScaleResult } from "../../shared/types";
import { BREAKPOINT_LABELS } from "../../shared/types";

export interface CreateTypeVariablesResult {
  variableCount: number;
}

/**
 * Creates two FLOAT variables per step — Font Size and Line Height, no
 * Paragraph Spacing (removed by request) — grouped by category: all H1-H6
 * under "Heading", Body/Body Large/etc under "Body", and any other name
 * (Label, Caption, Link, ...) becomes its own group named after itself.
 * Matches the reference "Responsive" collection structure exactly:
 * `Heading/H1/Font Size`, `Heading/H1/Line Height`, etc.
 *
 * Modes: Desktop is always the default mode; Tablet and Mobile modes are
 * only added if those breakpoints are active. Per the explicit
 * constraint, ONLY heading steps get different values across modes —
 * body/other steps write their single value into every active mode, so
 * they exist as one real value even though the collection technically
 * requires a value per mode.
 *
 * The Line Height variable stores the actual computed pixel value
 * (line-height ratio × font size, grid-rounded) — NOT the raw ratio typed
 * into the plugin — per explicit request.
 *
 * Font Family and Font Weight STRING variables are created in a separate
 * collection selected by the user. That collection keeps its own single
 * Default mode and never receives responsive modes from the type scale.
 *
 * Same find-or-create collection and update-in-place-on-regenerate
 * behavior as color's createVariableCollection.ts.
 */
export async function createTypeVariables(
  typeCollectionName: string,
  fontCollectionName: string,
  scale: TypeScaleResult,
  onProgress: (percent: number, label: string) => void,
): Promise<CreateTypeVariablesResult> {
  const existingCollections = await figma.variables.getLocalVariableCollectionsAsync();
  const collection =
    existingCollections.find((c) => c.name === typeCollectionName) ??
    figma.variables.createVariableCollection(typeCollectionName);
  const existingFontCollection = existingCollections.find((c) => c.name === fontCollectionName);
  const fontCollection = existingFontCollection ?? figma.variables.createVariableCollection(fontCollectionName);
  if (!existingFontCollection) {
    fontCollection.renameMode(fontCollection.modes[0].modeId, "Default");
  }

  const existingVariables = await Promise.all(
    collection.variableIds.map((id) => figma.variables.getVariableByIdAsync(id)),
  );
  const variableByName = new Map<string, Variable>();
  for (const variable of existingVariables) {
    if (variable) variableByName.set(variable.name, variable);
  }
  const existingFontVariables = await Promise.all(
    fontCollection.variableIds.map((id) => figma.variables.getVariableByIdAsync(id)),
  );
  const fontVariableByName = new Map<string, Variable>();
  for (const variable of existingFontVariables) {
    if (variable) fontVariableByName.set(variable.name, variable);
  }

  const desktopModeId = collection.modes[0].modeId;
  if (collection.modes[0].name !== "Desktop") {
    collection.renameMode(desktopModeId, "Desktop");
  }
  const modeIds: Record<Breakpoint, string | null> = { desktop: desktopModeId, tablet: null, mobile: null };
  for (const bp of scale.activeBreakpoints) {
    if (bp === "desktop") continue;
    const label = BREAKPOINT_LABELS[bp];
    const existing = collection.modes.find((m) => m.name === label);
    modeIds[bp] = existing ? existing.modeId : collection.addMode(label);
  }

  function upsertFloat(name: string): Variable {
    return variableByName.get(name) ?? figma.variables.createVariable(name, collection, "FLOAT");
  }

  function upsertString(name: string, value: string): Variable {
    const variable = fontVariableByName.get(name) ?? figma.variables.createVariable(name, fontCollection, "STRING");
    // Do not add modes here. A new font collection has only Default; an
    // existing collection receives the same value in whichever modes it
    // already owns, as required by Figma's variable API.
    for (const mode of fontCollection.modes) {
      variable.setValueForMode(mode.modeId, value);
    }
    return variable;
  }

  const distinctFamilies = Array.from(new Set(scale.fonts.map((f) => f.family)));
  const distinctWeights = Array.from(new Set(scale.fonts.map((f) => f.weight)));
  const fontVariableCount = distinctFamilies.length + distinctWeights.length;
  const total = scale.steps.length * 2 + fontVariableCount;
  let created = 0;

  for (const family of distinctFamilies) {
    upsertString(`Fonts/Font Family/${family}`, family);
    created++;
    onProgress(Math.round((created / total) * 100), `Creating Fonts/Font Family/${family}`);
  }
  for (const weight of distinctWeights) {
    upsertString(`Fonts/Font Weight/${weight}`, weight);
    created++;
    onProgress(Math.round((created / total) * 100), `Creating Fonts/Font Weight/${weight}`);
  }

  for (const step of scale.steps) {
    const fontSizeName = `${step.group}/${step.name}/Font Size`;
    const lineHeightName = `${step.group}/${step.name}/Line Height`;
    const fontSizeVar = upsertFloat(fontSizeName);
    const lineHeightVar = upsertFloat(lineHeightName);

    if (step.category === "heading") {
      for (const bp of scale.activeBreakpoints) {
        const modeId = modeIds[bp];
        const value = step.byBreakpoint[bp];
        if (!modeId || !value) continue;
        fontSizeVar.setValueForMode(modeId, value.px);
        lineHeightVar.setValueForMode(modeId, roundToGrid(value.lineHeight * value.px, scale.gridSize));
      }
    } else {
      const px = step.single.px;
      const lineHeightPx = roundToGrid(step.single.lineHeight * px, scale.gridSize);
      fontSizeVar.setValueForMode(desktopModeId, px);
      lineHeightVar.setValueForMode(desktopModeId, lineHeightPx);
      for (const bp of scale.activeBreakpoints) {
        const modeId = modeIds[bp];
        if (modeId) {
          fontSizeVar.setValueForMode(modeId, px);
          lineHeightVar.setValueForMode(modeId, lineHeightPx);
        }
      }
    }

    created += 2;
    onProgress(Math.round((created / total) * 100), `Creating ${step.group}/${step.name}`);
    if (created % 25 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return { variableCount: created };
}
