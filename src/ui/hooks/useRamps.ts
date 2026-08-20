import { useMemo } from "react";
import { generateTailwindScale } from "../../color/tailwindScale";
import { generateMaterialPalette } from "../../color/materialPalette";
import type { Algorithm, Ramp } from "../../shared/types";
import type { ColorEntry } from "../state/store";

const HEX_PATTERN = /^#?[0-9a-fA-F]{6}$/;

export interface RampResult {
  entryId: string;
  ramp: Ramp | null;
  /** True once the entry has a name and a syntactically valid hex — used
   * to decide whether Generate should be enabled. */
  isValid: boolean;
}

/**
 * Derives the actual generated Ramp for every color entry, recomputed
 * whenever the entries or algorithm change.
 *
 * This is a real useMemo over the store's actual reactive fields — NOT a
 * function stashed in the Zustand store and called on demand. That
 * earlier pattern (`ramp: () => computeRamp(get())`) is why the live
 * preview didn't update when picking a color from the native color panel:
 * selecting `state.ramp` as a Zustand selector always returns the same
 * function reference, so Zustand's equality check never considered that
 * subscription "changed," and nothing re-rendered until some unrelated
 * field (like the mode selector) happened to force a re-render anyway.
 */
export function useRamps(colorEntries: ColorEntry[], algorithm: Algorithm): RampResult[] {
  return useMemo(
    () =>
      colorEntries.map((entry) => {
        const normalized = entry.hex.startsWith("#") ? entry.hex : `#${entry.hex}`;
        const isValid = entry.name.trim().length > 0 && HEX_PATTERN.test(normalized);

        if (!isValid) {
          return { entryId: entry.id, ramp: null, isValid: false };
        }

        try {
          const ramp =
            algorithm === "material-hct"
              ? generateMaterialPalette(entry.name.trim(), normalized)
              : generateTailwindScale(entry.name.trim(), normalized);
          return { entryId: entry.id, ramp, isValid: true };
        } catch {
          return { entryId: entry.id, ramp: null, isValid: false };
        }
      }),
    [colorEntries, algorithm],
  );
}
