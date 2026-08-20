import { defaultLineHeightForSize } from "./lineHeight";
import type {
  Breakpoint,
  BreakpointConfig,
  BreakpointValue,
  FontEntry,
  ResolvedTypeStep,
  StepCategory,
  TypeScaleResult,
  TypeStepInput,
} from "../shared/types";
import { BREAKPOINTS } from "../shared/types";

const REM_BASE = 16;

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function roundToGrid(value: number, gridSize: number): number {
  if (gridSize <= 0) return Math.round(value * 100) / 100;
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Only exactly "H1".."H6" (case-insensitive) count as headings — the
 * request was explicit about this boundary ("only for h1 to h6; no body
 * text, no label, caption, or anything"), so this is intentionally
 * literal rather than pattern-matching anything heading-shaped. Anything
 * containing "body" groups under "Body"; everything else becomes its own
 * group named after itself (Label, Caption, Link, ...).
 */
export function categorizeStepName(name: string): { category: StepCategory; group: string } {
  const trimmed = name.trim();
  if (/^h[1-6]$/i.test(trimmed)) return { category: "heading", group: "Heading" };
  if (/body/i.test(trimmed)) return { category: "body", group: "Body" };
  return { category: "other", group: trimmed || "Other" };
}

/** Which active breakpoint is the "canonical" one for non-heading steps
 * and for seeding new custom rows — Desktop if present, else Tablet, else
 * whichever is left, since at least one breakpoint is always active. */
export function primaryBreakpoint(active: Breakpoint[]): Breakpoint {
  for (const bp of BREAKPOINTS) {
    if (active.includes(bp)) return bp;
  }
  return active[0];
}

function valueAt(baseSize: number, ratio: number, exponent: number, gridSize: number): BreakpointValue {
  const px = roundToGrid(baseSize * Math.pow(ratio, exponent), gridSize);
  return { px, lineHeight: defaultLineHeightForSize(px) };
}

const HEADING_EXPONENTS: Record<string, number> = { H1: 6, H2: 5, H3: 4, H4: 3, H5: 2, H6: 1 };

/**
 * Generates the default H1-H6 + Body scaffold — no Display/Body Small/
 * Caption; if more is wanted, the person adds and names it themselves
 * (explicit request: "by default it only creates h1 to h6, and the base
 * font called body... if I need anything more I will create that").
 * Each active breakpoint uses its OWN base/ratio (real designers don't
 * scale every breakpoint the same way); Body gets one canonical value
 * from the primary breakpoint only, per the heading-only-modes rule.
 */
export function generateDefaultSteps(
  activeBreakpoints: Breakpoint[],
  breakpointConfigs: Partial<Record<Breakpoint, BreakpointConfig>>,
  gridSize: number,
  defaultFontEntryId: string,
): TypeStepInput[] {
  const headingNames = ["H1", "H2", "H3", "H4", "H5", "H6"];
  const headingSteps: TypeStepInput[] = headingNames.map((name) => {
    const exponent = HEADING_EXPONENTS[name];
    const byBreakpoint: TypeStepInput["byBreakpoint"] = {};
    for (const bp of activeBreakpoints) {
      const config = breakpointConfigs[bp];
      if (config) byBreakpoint[bp] = valueAt(config.baseSize, config.ratio, exponent, gridSize);
    }
    return {
      id: nextId("type-step"),
      name,
      category: "heading",
      fontEntryIds: [defaultFontEntryId],
      byBreakpoint,
      single: { px: 16, lineHeight: 1.5 }, // unused while category is "heading"
    };
  });

  const primary = primaryBreakpoint(activeBreakpoints);
  const primaryConfig = breakpointConfigs[primary];
  const bodyValue = primaryConfig
    ? valueAt(primaryConfig.baseSize, 1, 0, gridSize)
    : { px: 16, lineHeight: defaultLineHeightForSize(16) };

  const bodyStep: TypeStepInput = {
    id: nextId("type-step"),
    name: "Body",
    category: "body",
    fontEntryIds: [defaultFontEntryId],
    byBreakpoint: {},
    single: bodyValue,
  };

  return [...headingSteps, bodyStep];
}

/** Creates a new custom step continuing the primary breakpoint's ratio
 * from whichever heading step is currently largest/smallest — covers
 * "I need a bigger font than H1" and "a smaller base" from the request.
 * The new step starts as a single-value ("other") row; if renamed to
 * exactly H1-H6 it becomes a heading and gains per-breakpoint fields (see
 * `seedBreakpointValues` below, used by the store when that happens). */
export function makeAdjacentStep(
  name: string,
  direction: "larger" | "smaller",
  existingSteps: TypeStepInput[],
  activeBreakpoints: Breakpoint[],
  breakpointConfigs: Partial<Record<Breakpoint, BreakpointConfig>>,
  gridSize: number,
  defaultFontEntryId: string,
): TypeStepInput {
  const primary = primaryBreakpoint(activeBreakpoints);
  const config = breakpointConfigs[primary] ?? { baseSize: 16, ratio: 1.25 };

  const referenceValues = existingSteps
    .map((s) => (s.category === "heading" ? s.byBreakpoint[primary]?.px : s.single.px))
    .filter((px): px is number => typeof px === "number");
  const reference = referenceValues.length > 0 ? referenceValues : [config.baseSize];

  const nextPx =
    direction === "larger" ? Math.max(...reference) * config.ratio : Math.min(...reference) / config.ratio;

  const px = roundToGrid(nextPx, gridSize);
  return {
    id: nextId("type-step"),
    name,
    category: "other",
    fontEntryIds: [defaultFontEntryId],
    byBreakpoint: {},
    single: { px, lineHeight: defaultLineHeightForSize(px) },
  };
}

/** When a step's name is edited into exactly H1-H6 and it has no
 * per-breakpoint values yet, seed every active breakpoint with its
 * current single value as a starting point — fully editable afterward,
 * same "formula gives a starting point, not a cage" relationship as
 * everywhere else in this scale. */
export function seedBreakpointValues(step: TypeStepInput, activeBreakpoints: Breakpoint[]): TypeStepInput["byBreakpoint"] {
  const seeded: TypeStepInput["byBreakpoint"] = { ...step.byBreakpoint };
  for (const bp of activeBreakpoints) {
    if (!seeded[bp]) seeded[bp] = { ...step.single };
  }
  return seeded;
}

function resolveStep(step: TypeStepInput, fonts: FontEntry[]): ResolvedTypeStep {
  const { category, group } = categorizeStepName(step.name);
  const fontStyles = step.fontEntryIds
    .map((id) => fonts.find((font) => font.id === id))
    .filter((font): font is FontEntry => Boolean(font));
  const resolvedFontStyles = fontStyles.length > 0 ? fontStyles : fonts.slice(0, 1);

  const byBreakpoint: ResolvedTypeStep["byBreakpoint"] = {};
  for (const [bp, value] of Object.entries(step.byBreakpoint)) {
    if (value) byBreakpoint[bp as Breakpoint] = { ...value, rem: Math.round((value.px / REM_BASE) * 1000) / 1000 };
  }

  return {
    id: step.id,
    name: step.name.trim(),
    category,
    group,
    fontStyles: resolvedFontStyles,
    byBreakpoint,
    single: { ...step.single, rem: Math.round((step.single.px / REM_BASE) * 1000) / 1000 },
  };
}

export function buildTypeScaleResult(
  activeBreakpoints: Breakpoint[],
  breakpointConfigs: Partial<Record<Breakpoint, BreakpointConfig>>,
  gridSize: number,
  fonts: FontEntry[],
  steps: TypeStepInput[],
): TypeScaleResult {
  if (activeBreakpoints.length === 0) {
    throw new Error("At least one breakpoint (Desktop, Tablet, or Mobile) must be active.");
  }
  if (fonts.length === 0) {
    throw new Error("Add at least one font.");
  }
  if (steps.length === 0) {
    throw new Error("Add at least one type step.");
  }
  for (const step of steps) {
    if (!step.name.trim()) {
      throw new Error("Every type step needs a name.");
    }
    const { category } = categorizeStepName(step.name);
    if (category === "heading") {
      for (const bp of activeBreakpoints) {
        const value = step.byBreakpoint[bp];
        if (!value || value.px <= 0) {
          throw new Error(`"${step.name}" is missing a size for ${bp}.`);
        }
      }
    } else if (step.single.px <= 0) {
      throw new Error(`"${step.name}" needs a positive size.`);
    }
  }

  return {
    activeBreakpoints,
    breakpointConfigs,
    gridSize,
    fonts,
    steps: steps.map((s) => resolveStep(s, fonts)),
  };
}
