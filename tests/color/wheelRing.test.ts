import { describe, it, expect } from "vitest";
import { generateWheelRingStops } from "../../src/color/wheelRing";

describe("generateWheelRingStops", () => {
  it("returns the requested number of stops", () => {
    expect(generateWheelRingStops(36)).toHaveLength(36);
  });

  it("returns every stop as a valid 6-digit hex", () => {
    for (const hex of generateWheelRingStops(24)) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("returns visually distinct colors around the ring, not a flat color", () => {
    const stops = generateWheelRingStops(12);
    const unique = new Set(stops);
    expect(unique.size).toBeGreaterThan(8);
  });
});
