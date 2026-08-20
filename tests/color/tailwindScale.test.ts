import { describe, it, expect } from "vitest";
import { converter } from "culori";
import { generateTailwindScale } from "../../src/color/tailwindScale";
import { TAILWIND_STEPS } from "../../src/shared/types";

const toOklch = converter("oklch");

describe("generateTailwindScale", () => {
  it("anchors step 500 exactly on the input hex", () => {
    const ramp = generateTailwindScale("Blue", "#4F46E5");
    const step500 = ramp.swatches.find((s) => s.step === "500");
    expect(step500?.hex).toBe("#4f46e5");
    expect(step500?.isSourceStep).toBe(true);
  });

  it("produces exactly the eleven documented steps, in order", () => {
    const ramp = generateTailwindScale("Blue", "#4F46E5");
    expect(ramp.swatches.map((s) => s.step)).toEqual(TAILWIND_STEPS.map(String));
  });

  it("is monotonically decreasing in OKLCH lightness from 50 to 950", () => {
    const ramp = generateTailwindScale("Blue", "#4F46E5");
    const lightnesses = ramp.swatches.map((s) => toOklch(s.hex)?.l ?? 0);
    for (let i = 1; i < lightnesses.length; i++) {
      expect(lightnesses[i]).toBeLessThanOrEqual(lightnesses[i - 1] + 1e-6);
    }
  });

  it("only marks a single source step", () => {
    const ramp = generateTailwindScale("Blue", "#4F46E5");
    expect(ramp.swatches.filter((s) => s.isSourceStep)).toHaveLength(1);
  });

  it("produces every swatch as a valid, in-gamut 6-digit hex", () => {
    const ramp = generateTailwindScale("Blue", "#4F46E5");
    for (const swatch of ramp.swatches) {
      expect(swatch.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("handles a very light source color without producing an invalid ramp", () => {
    const ramp = generateTailwindScale("Pale", "#F5F0FF");
    expect(ramp.swatches).toHaveLength(11);
    expect(ramp.swatches.find((s) => s.step === "500")?.hex).toBe("#f5f0ff");
  });

  it("handles a very dark source color without producing an invalid ramp", () => {
    const ramp = generateTailwindScale("Deep", "#0A0520");
    expect(ramp.swatches).toHaveLength(11);
    expect(ramp.swatches.find((s) => s.step === "500")?.hex).toBe("#0a0520");
  });

  it("rejects an invalid hex", () => {
    expect(() => generateTailwindScale("Bad", "not-a-color")).toThrow();
  });
});
