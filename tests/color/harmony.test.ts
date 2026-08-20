import { describe, it, expect } from "vitest";
import { converter } from "culori";
import { computeHarmony, HARMONY_SCHEMES } from "../../src/color/harmony";

const toOklch = converter("oklch");

function normalizeForTest(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

describe("computeHarmony", () => {
  it("places the complement exactly 180° from the base, wrapping correctly", () => {
    const colors = computeHarmony("#4F46E5", "complementary");
    expect(colors).toHaveLength(2);
    const base = colors.find((c) => c.isBase)!;
    const complement = colors.find((c) => !c.isBase)!;
    const diff = Math.abs(complement.hue - base.hue);
    // Either 180 apart directly, or wrapped (e.g. 350 vs 170 -> 180 apart the short way)
    expect(Math.min(diff, 360 - diff)).toBeCloseTo(180, 0);
  });

  it("produces exactly 3 colors for split-complementary, flanking the true complement", () => {
    const colors = computeHarmony("#4F46E5", "split-complementary");
    expect(colors).toHaveLength(3);
    const base = colors.find((c) => c.isBase)!;
    const trueComplement = (base.hue + 180) % 360;
    for (const c of colors.filter((c) => !c.isBase)) {
      const diff = Math.abs(c.hue - trueComplement);
      const wrapped = Math.min(diff, 360 - diff);
      expect(wrapped).toBeCloseTo(30, 0);
    }
  });

  it("produces exactly 3 colors for analogous, each 30° from base", () => {
    const colors = computeHarmony("#4F46E5", "analogous");
    expect(colors).toHaveLength(3);
    const base = colors.find((c) => c.isBase)!;
    for (const c of colors.filter((c) => !c.isBase)) {
      const diff = Math.abs(c.hue - base.hue);
      const wrapped = Math.min(diff, 360 - diff);
      expect(wrapped).toBeCloseTo(30, 0);
    }
  });

  it("produces exactly 3 evenly-spaced colors for triadic (120° apart)", () => {
    const colors = computeHarmony("#4F46E5", "triadic");
    expect(colors).toHaveLength(3);
    const hues = colors.map((c) => c.hue).sort((a, b) => a - b);
    for (let i = 1; i < hues.length; i++) {
      const gap = hues[i] - hues[i - 1];
      expect(gap).toBeCloseTo(120, 0);
    }
  });

  it("produces exactly 4 evenly-spaced colors for square (90° apart)", () => {
    const colors = computeHarmony("#4F46E5", "square");
    expect(colors).toHaveLength(4);
    const hues = colors.map((c) => c.hue).sort((a, b) => a - b);
    for (let i = 1; i < hues.length; i++) {
      expect(hues[i] - hues[i - 1]).toBeCloseTo(90, 0);
    }
  });

  it("tetradic is a rectangle (60°/120° alternating gaps), not evenly spaced like square", () => {
    const colors = computeHarmony("#4F46E5", "tetradic");
    expect(colors).toHaveLength(4);
    const hues = colors.map((c) => c.hue).sort((a, b) => a - b);
    const gaps = hues.map((h, i) => (i === 0 ? hues[hues.length - 1] : hues[i - 1])).map((prev, i) => {
      const gap = hues[i] - prev;
      return gap < 0 ? gap + 360 : gap;
    });
    const uniqueGaps = new Set(gaps.map((g) => Math.round(g)));
    // A true rectangle has two distinct gap sizes (e.g. 60° and 120°),
    // unlike square's single repeated 90° gap.
    expect(uniqueGaps.size).toBe(2);
  });

  it("tetradic contains two genuine complementary pairs", () => {
    const colors = computeHarmony("#4F46E5", "tetradic");
    const hues = colors.map((c) => c.hue);
    for (const h of hues) {
      const complement = normalizeForTest(h + 180);
      const hasPair = hues.some((other) => Math.abs(normalizeForTest(other - complement)) < 1);
      expect(hasPair).toBe(true);
    }
  });

  it("monochromatic holds hue fixed and only varies lightness", () => {
    const colors = computeHarmony("#4F46E5", "monochromatic");
    expect(colors).toHaveLength(5);
    const baseHue = colors.find((c) => c.isBase)!.hue;
    for (const c of colors) {
      expect(c.hue).toBeCloseTo(baseHue, 0);
    }
    // Distinct lightness steps should mean distinct hex values.
    const unique = new Set(colors.map((c) => c.hex));
    expect(unique.size).toBe(5);
  });

  it("monochromatic's base entry matches the input exactly", () => {
    const colors = computeHarmony("#4F46E5", "monochromatic");
    expect(colors.find((c) => c.isBase)!.hex).toBe("#4f46e5");
  });

  it("marks exactly one color as the base in every scheme", () => {
    for (const scheme of HARMONY_SCHEMES) {
      const colors = computeHarmony("#4F46E5", scheme.value);
      expect(colors.filter((c) => c.isBase)).toHaveLength(1);
    }
  });

  it("the base entry's hex matches the input color", () => {
    const colors = computeHarmony("#4F46E5", "triadic");
    const base = colors.find((c) => c.isBase)!;
    expect(base.hex).toBe("#4f46e5");
  });

  it("produces a valid, in-gamut hex for every generated color, for a wide range of hues", () => {
    const testColors = ["#EF4444", "#F59E0B", "#22C55E", "#06B6D4", "#8B5CF6", "#EC4899"];
    for (const hex of testColors) {
      for (const scheme of HARMONY_SCHEMES) {
        const colors = computeHarmony(hex, scheme.value);
        for (const c of colors) {
          expect(c.hex).toMatch(/^#[0-9a-f]{6}$/);
        }
      }
    }
  });

  it("rejects an invalid hex", () => {
    expect(() => computeHarmony("not-a-color", "complementary")).toThrow();
  });

  it("HARMONY_SCHEMES includes the schemes the user asked for by name", () => {
    const values = HARMONY_SCHEMES.map((s) => s.value);
    expect(values).toContain("complementary");
    expect(values).toContain("split-complementary");
    expect(values).toContain("analogous");
  });
});
