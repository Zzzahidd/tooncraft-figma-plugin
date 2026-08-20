import { describe, it, expect } from "vitest";
import { generateMaterialPalette } from "../../src/color/materialPalette";
import { MATERIAL_TONE_STOPS } from "../../src/shared/types";

describe("generateMaterialPalette", () => {
  it("produces at least the standard tone stops", () => {
    const ramp = generateMaterialPalette("Blue", "#4F46E5");
    const labels = ramp.swatches.map((s) => s.step);
    for (const tone of MATERIAL_TONE_STOPS) {
      expect(labels).toContain(`Tone ${tone}`);
    }
  });

  it("does not force the source hex onto tone 50", () => {
    // #4F46E5's own HCT tone is ~40.7, not 50 — the algorithm must not
    // silently overwrite tone 50 with the literal input color the way the
    // Tailwind algorithm overwrites step 500.
    const ramp = generateMaterialPalette("Blue", "#4F46E5");
    const tone50 = ramp.swatches.find((s) => s.step === "Tone 50");
    expect(tone50?.hex).not.toBe("#4f46e5");
  });

  it("adds a distinct Source entry when the input doesn't land on a standard stop", () => {
    // #3D9970's HCT tone is ~57, which is more than 1.5 away from both the
    // 50 and 60 standard stops.
    const ramp = generateMaterialPalette("Green", "#3D9970");
    const source = ramp.swatches.find((s) => s.isSourceStep);
    expect(source?.step).toBe("Source");
  });

  it("marks the nearest standard stop as source instead of duplicating it", () => {
    // A color whose HCT tone lands almost exactly on 50 shouldn't produce
    // both a "Tone 50" and a near-duplicate "Source" entry.
    const ramp = generateMaterialPalette("Neutral", "#8B8B93");
    const sourceEntries = ramp.swatches.filter((s) => s.isSourceStep);
    expect(sourceEntries).toHaveLength(1);
  });

  it("produces tones in strictly decreasing lightness order (100 -> 0)", () => {
    const ramp = generateMaterialPalette("Blue", "#4F46E5");
    for (let i = 1; i < ramp.swatches.length; i++) {
      expect(ramp.swatches[i].oklch.l).toBeLessThanOrEqual(ramp.swatches[i - 1].oklch.l + 1e-6);
    }
  });

  it("produces every swatch as a valid 6-digit hex", () => {
    const ramp = generateMaterialPalette("Blue", "#4F46E5");
    for (const swatch of ramp.swatches) {
      expect(swatch.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
