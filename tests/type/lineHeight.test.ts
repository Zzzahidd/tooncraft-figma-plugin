import { describe, it, expect } from "vitest";
import { defaultLineHeightForSize } from "../../src/type/lineHeight";

describe("defaultLineHeightForSize", () => {
  it("gives large display text a tight line-height (1.1-1.3 range)", () => {
    const lh = defaultLineHeightForSize(61);
    expect(lh).toBeGreaterThanOrEqual(1.1);
    expect(lh).toBeLessThanOrEqual(1.3);
  });

  it("gives body text a comfortable line-height (1.5-1.7 range)", () => {
    const lh = defaultLineHeightForSize(16);
    expect(lh).toBeGreaterThanOrEqual(1.5);
    expect(lh).toBeLessThanOrEqual(1.7);
  });

  it("gives small caption text the loosest line-height (1.6-1.8 range)", () => {
    const lh = defaultLineHeightForSize(11);
    expect(lh).toBeGreaterThanOrEqual(1.6);
    expect(lh).toBeLessThanOrEqual(1.8);
  });

  it("is monotonically decreasing as size increases", () => {
    const sizes = [10, 16, 20, 25, 31, 39, 49, 61, 80];
    const values = sizes.map(defaultLineHeightForSize);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1]);
    }
  });

  it("clamps beyond both ends of the anchor range instead of extrapolating", () => {
    expect(defaultLineHeightForSize(5)).toBe(1.7);
    expect(defaultLineHeightForSize(200)).toBe(1.1);
  });
});
