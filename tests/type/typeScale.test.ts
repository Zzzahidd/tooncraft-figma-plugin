import { describe, it, expect } from "vitest";
import {
  categorizeStepName,
  generateDefaultSteps,
  makeAdjacentStep,
  seedBreakpointValues,
  buildTypeScaleResult,
  roundToGrid,
  primaryBreakpoint,
} from "../../src/type/typeScale";
import type { BreakpointConfig, Breakpoint, FontEntry, TypeStepInput } from "../../src/shared/types";

const FONTS: FontEntry[] = [{ id: "f1", family: "Inter", weight: "Regular" }];

describe("categorizeStepName", () => {
  it("categorizes exactly H1-H6 as heading, case-insensitively", () => {
    for (const name of ["H1", "h2", "H6"]) {
      expect(categorizeStepName(name).category).toBe("heading");
      expect(categorizeStepName(name).group).toBe("Heading");
    }
  });

  it("does not treat H7 or Heading-1 as a heading — the boundary is literal", () => {
    expect(categorizeStepName("H7").category).not.toBe("heading");
    expect(categorizeStepName("Heading 1").category).not.toBe("heading");
  });

  it("categorizes anything containing 'body' as body, regardless of case or suffix", () => {
    expect(categorizeStepName("Body").category).toBe("body");
    expect(categorizeStepName("body large").category).toBe("body");
    expect(categorizeStepName("BODY SMALL").group).toBe("Body");
  });

  it("gives every other name its own group named after itself", () => {
    expect(categorizeStepName("Label")).toEqual({ category: "other", group: "Label" });
    expect(categorizeStepName("Caption")).toEqual({ category: "other", group: "Caption" });
  });
});

describe("primaryBreakpoint", () => {
  it("prefers Desktop, then Tablet, then Mobile", () => {
    expect(primaryBreakpoint(["mobile", "desktop"])).toBe("desktop");
    expect(primaryBreakpoint(["mobile", "tablet"])).toBe("tablet");
    expect(primaryBreakpoint(["mobile"])).toBe("mobile");
  });
});

describe("generateDefaultSteps", () => {
  const configs: Partial<Record<Breakpoint, BreakpointConfig>> = {
    desktop: { baseSize: 16, ratio: 1.25 },
  };

  it("creates exactly H1-H6 + Body, nothing else, by default", () => {
    const steps = generateDefaultSteps(["desktop"], configs, 4, "f1");
    expect(steps.map((s) => s.name)).toEqual(["H1", "H2", "H3", "H4", "H5", "H6", "Body"]);
  });

  it("marks H1-H6 as heading and Body as body", () => {
    const steps = generateDefaultSteps(["desktop"], configs, 4, "f1");
    expect(steps.filter((s) => s.category === "heading")).toHaveLength(6);
    expect(steps.find((s) => s.name === "Body")!.category).toBe("body");
  });

  it("only populates byBreakpoint for active breakpoints", () => {
    const steps = generateDefaultSteps(["desktop"], configs, 4, "f1");
    const h1 = steps.find((s) => s.name === "H1")!;
    expect(h1.byBreakpoint.desktop).toBeTruthy();
    expect(h1.byBreakpoint.mobile).toBeUndefined();
  });

  it("uses each breakpoint's OWN ratio, not a derived fraction of desktop's", () => {
    const twoBpConfigs: Partial<Record<Breakpoint, BreakpointConfig>> = {
      desktop: { baseSize: 16, ratio: 1.25 }, // Major Third
      mobile: { baseSize: 16, ratio: 1.2 }, // Minor Third — different ratio entirely
    };
    const steps = generateDefaultSteps(["desktop", "mobile"], twoBpConfigs, 1, "f1");
    const h1 = steps.find((s) => s.name === "H1")!;
    const desktopPx = h1.byBreakpoint.desktop!.px;
    const mobilePx = h1.byBreakpoint.mobile!.px;
    expect(desktopPx).toBeCloseTo(16 * Math.pow(1.25, 6), 0);
    expect(mobilePx).toBeCloseTo(16 * Math.pow(1.2, 6), 0);
  });

  it("Body has no per-breakpoint values even when multiple breakpoints are active", () => {
    const twoBpConfigs: Partial<Record<Breakpoint, BreakpointConfig>> = {
      desktop: { baseSize: 16, ratio: 1.25 },
      mobile: { baseSize: 14, ratio: 1.2 },
    };
    const steps = generateDefaultSteps(["desktop", "mobile"], twoBpConfigs, 4, "f1");
    const body = steps.find((s) => s.name === "Body")!;
    expect(Object.keys(body.byBreakpoint)).toHaveLength(0);
    expect(body.single.px).toBeGreaterThan(0);
  });

  it("grid-rounds every generated size", () => {
    const steps = generateDefaultSteps(["desktop"], configs, 4, "f1");
    for (const step of steps) {
      const px = step.category === "heading" ? step.byBreakpoint.desktop!.px : step.single.px;
      expect(px % 4).toBe(0);
    }
  });
});

describe("makeAdjacentStep", () => {
  const configs: Partial<Record<Breakpoint, BreakpointConfig>> = {
    desktop: { baseSize: 16, ratio: 1.25 },
  };

  it("a larger step continues the ratio above the current largest step", () => {
    const existing = generateDefaultSteps(["desktop"], configs, 4, "f1");
    const h1Px = existing.find((s) => s.name === "H1")!.byBreakpoint.desktop!.px;
    const bigger = makeAdjacentStep("New larger step", "larger", existing, ["desktop"], configs, 4, "f1");
    expect(bigger.single.px).toBeGreaterThan(h1Px);
    expect(bigger.category).toBe("other");
  });

  it("a smaller step continues the ratio below the current smallest step", () => {
    const existing = generateDefaultSteps(["desktop"], configs, 4, "f1");
    const bodyPx = existing.find((s) => s.name === "Body")!.single.px;
    const smaller = makeAdjacentStep("New smaller step", "smaller", existing, ["desktop"], configs, 4, "f1");
    expect(smaller.single.px).toBeLessThan(bodyPx);
  });
});

describe("seedBreakpointValues", () => {
  it("seeds every active breakpoint from the single value when renamed into a heading", () => {
    const step: TypeStepInput = {
      id: "x",
      name: "Overline",
      category: "other",
      fontEntryIds: ["f1"],
      byBreakpoint: {},
      single: { px: 80, lineHeight: 1.1 },
    };
    const seeded = seedBreakpointValues(step, ["desktop", "mobile"]);
    expect(seeded.desktop).toEqual({ px: 80, lineHeight: 1.1 });
    expect(seeded.mobile).toEqual({ px: 80, lineHeight: 1.1 });
  });

  it("does not overwrite a breakpoint that already has a value", () => {
    const step: TypeStepInput = {
      id: "x",
      name: "H1",
      category: "heading",
      fontEntryIds: ["f1"],
      byBreakpoint: { desktop: { px: 48, lineHeight: 1.15 } },
      single: { px: 16, lineHeight: 1.5 },
    };
    const seeded = seedBreakpointValues(step, ["desktop", "mobile"]);
    expect(seeded.desktop).toEqual({ px: 48, lineHeight: 1.15 });
    expect(seeded.mobile).toEqual({ px: 16, lineHeight: 1.5 });
  });
});

describe("buildTypeScaleResult", () => {
  const configs: Partial<Record<Breakpoint, BreakpointConfig>> = { desktop: { baseSize: 16, ratio: 1.25 } };

  it("resolves rem for both heading (per-breakpoint) and body (single) steps", () => {
    const steps = generateDefaultSteps(["desktop"], configs, 4, "f1");
    const result = buildTypeScaleResult(["desktop"], configs, 4, FONTS, steps);
    const h1 = result.steps.find((s) => s.name === "H1")!;
    const body = result.steps.find((s) => s.name === "Body")!;
    expect(h1.byBreakpoint.desktop!.rem).toBeCloseTo(h1.byBreakpoint.desktop!.px / 16, 3);
    expect(body.single.rem).toBeCloseTo(body.single.px / 16, 3);
  });

  it("carries each selected font style from the referenced font entries", () => {
    const steps = generateDefaultSteps(["desktop"], configs, 4, "f1");
    const result = buildTypeScaleResult(["desktop"], configs, 4, FONTS, steps);
    expect(result.steps[0].fontStyles).toEqual([{ id: "f1", family: "Inter", weight: "Regular" }]);
  });

  it("does not require a scale name or custom metric names", () => {
    const steps = generateDefaultSteps(["desktop"], configs, 4, "f1");
    const result = buildTypeScaleResult(["desktop"], configs, 4, FONTS, steps);
    expect(result.steps).toHaveLength(7);
  });

  it("rejects an empty breakpoint list", () => {
    const steps = generateDefaultSteps(["desktop"], configs, 4, "f1");
    expect(() => buildTypeScaleResult([], {}, 4, FONTS, steps)).toThrow();
  });

  it("rejects an empty font list", () => {
    const steps = generateDefaultSteps(["desktop"], configs, 4, "f1");
    expect(() => buildTypeScaleResult(["desktop"], configs, 4, [], steps)).toThrow();
  });

  it("rejects a heading step missing a value for an active breakpoint", () => {
    const steps = generateDefaultSteps(["desktop"], configs, 4, "f1");
    expect(() => buildTypeScaleResult(["desktop", "mobile"], configs, 4, FONTS, steps)).toThrow();
  });
});

describe("roundToGrid", () => {
  it("snaps to the nearest multiple of the grid size", () => {
    expect(roundToGrid(61, 4)).toBe(60);
    expect(roundToGrid(49, 4)).toBe(48);
  });
});
