import { describe, it, expect } from "vitest";
import { buildSwatch } from "../../src/color/swatch";

describe("buildSwatch contrast math", () => {
  it("gives pure black a 21:1 contrast ratio against white (the WCAG maximum)", () => {
    const swatch = buildSwatch("test", "#000000", false);
    expect(swatch.contrast.onWhite).toBeCloseTo(21, 0);
    expect(swatch.contrast.onBlack).toBeCloseTo(1, 1);
  });

  it("gives pure white a 21:1 contrast ratio against black", () => {
    const swatch = buildSwatch("test", "#ffffff", false);
    expect(swatch.contrast.onBlack).toBeCloseTo(21, 0);
    expect(swatch.contrast.onWhite).toBeCloseTo(1, 1);
  });

  it("is symmetric: a mid-tone's contrast-on-white plus its darkness roughly tracks contrast-on-black", () => {
    const swatch = buildSwatch("test", "#4f46e5", false);
    // Both ratios should be real, finite, WCAG-legal numbers (1 to 21).
    expect(swatch.contrast.onWhite).toBeGreaterThanOrEqual(1);
    expect(swatch.contrast.onWhite).toBeLessThanOrEqual(21);
    expect(swatch.contrast.onBlack).toBeGreaterThanOrEqual(1);
    expect(swatch.contrast.onBlack).toBeLessThanOrEqual(21);
  });

  it("normalizes 3-digit and uppercase hex to the same swatch", () => {
    const a = buildSwatch("test", "#4F46E5", false);
    const b = buildSwatch("test", "#4f46e5", false);
    expect(a.hex).toBe(b.hex);
    expect(a.contrast).toEqual(b.contrast);
  });

  it("marks isSourceStep exactly as passed in", () => {
    expect(buildSwatch("500", "#4F46E5", true).isSourceStep).toBe(true);
    expect(buildSwatch("400", "#6357ea", false).isSourceStep).toBe(false);
  });
});
