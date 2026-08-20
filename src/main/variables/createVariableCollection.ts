import type { Ramp } from "../../shared/types";
import { hexToFigmaRgb } from "../hexToFigmaRgb";

export interface CreateVariablesResult {
  collection: VariableCollection;
  variableCount: number;
}

/**
 * Creates (or reuses) a Variable Collection named `collectionName`, then
 * creates one COLOR variable per swatch, grouped by ramp name so they show
 * up in Figma as `Blue/50`, `Blue/100`, etc.
 *
 * Regenerating the same primitive group name UPDATES the existing
 * variables in place rather than creating duplicates — this is what makes
 * "one collection holding every primitive" actually work across repeated
 * generations instead of accumulating a `Blue`, `Blue 2`, `Blue 3`... mess.
 *
 * If `createDarkMode` is true, a second "Dark" mode is added to the SAME
 * collection (not a separate collection) — that's what makes the variables
 * theme-switchable rather than just two disconnected sets of colors. The
 * dark value defaults to the same ramp read in reverse order (950 -> 50),
 * which is a reasonable default for a primitive scale; teams typically
 * remap this at the semantic-token layer rather than the primitive layer.
 */
export async function createVariableCollection(
  collectionName: string,
  ramps: Ramp[],
  createDarkMode: boolean,
  onProgress: (percent: number, label: string) => void,
): Promise<CreateVariablesResult> {
  const existingCollections = await figma.variables.getLocalVariableCollectionsAsync();
  const collection =
    existingCollections.find((c) => c.name === collectionName) ??
    figma.variables.createVariableCollection(collectionName);

  // Build a name -> Variable lookup for everything already in this
  // collection so regenerating a group updates in place.
  const existingVariables = await Promise.all(
    collection.variableIds.map((id) => figma.variables.getVariableByIdAsync(id)),
  );
  const variableByName = new Map<string, Variable>();
  for (const variable of existingVariables) {
    if (variable) variableByName.set(variable.name, variable);
  }

  const lightModeId = collection.modes[0].modeId;

  let darkModeId: string | null = null;
  if (createDarkMode) {
    if (collection.modes[0].name !== "Light") {
      collection.renameMode(lightModeId, "Light");
    }
    const existingDark = collection.modes.find((m) => m.name === "Dark");
    darkModeId = existingDark ? existingDark.modeId : collection.addMode("Dark");
  }

  let created = 0;
  const totalSwatches = ramps.reduce((sum, r) => sum + r.swatches.length, 0);

  for (const ramp of ramps) {
    const reversedForDark = [...ramp.swatches].reverse();

    for (let i = 0; i < ramp.swatches.length; i++) {
      const swatch = ramp.swatches[i];
      const variableName = `${ramp.name}/${swatch.step}`;

      const variable =
        variableByName.get(variableName) ??
        figma.variables.createVariable(variableName, collection, "COLOR");
      variable.setValueForMode(lightModeId, hexToFigmaRgb(swatch.hex));

      if (darkModeId) {
        const darkSwatch = reversedForDark[i];
        variable.setValueForMode(darkModeId, hexToFigmaRgb(darkSwatch.hex));
      }

      created++;
      onProgress(Math.round((created / totalSwatches) * 100), `Creating ${variableName}`);
      // Yield back to the event loop periodically so large batches don't
      // appear to freeze the plugin UI.
      if (created % 25 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  return { collection, variableCount: created };
}
