/**
 * Types shared between the UI thread (src/ui) and the main/sandbox thread
 * (src/main). Keep this file free of any React or Figma-API imports so it
 * can be imported from either side without pulling in the wrong runtime.
 */

export type Algorithm = "tailwind-oklch" | "material-hct";

export const TAILWIND_STEPS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;
export type TailwindStep = (typeof TAILWIND_STEPS)[number];

export const MATERIAL_TONE_STOPS = [
  0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100,
] as const;
export type MaterialTone = (typeof MATERIAL_TONE_STOPS)[number];

/** A single generated swatch, independent of which algorithm produced it. */
export interface Swatch {
  /** Step label, e.g. "500" for the Tailwind scale or "Tone 40" for M3. */
  step: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  oklch: { l: number; c: number; h: number };
  /** WCAG 2.1 contrast ratio against #FFFFFF and #000000. */
  contrast: {
    onWhite: number;
    onBlack: number;
  };
  /** True if this step exactly reproduces the user's input color. */
  isSourceStep: boolean;
}

export interface Ramp {
  /** e.g. "Blue" — the primitive group name, not the collection name. */
  name: string;
  algorithm: Algorithm;
  sourceHex: string;
  swatches: Swatch[];
}

export type GenerationMode = "variables" | "styles" | "both";

/**
 * Where the generated style-guide card row(s) should go:
 * - "none": don't build a card at all.
 * - "current": append to a card container on whichever page is active in
 *   Figma at the moment Generate is clicked.
 * - "dedicated": append to the persistent "🎨 Color System" page, creating
 *   it once and reusing it on every later generation.
 * Either way, generating again APPENDS a new row to the existing card
 * container rather than creating a second container.
 */
export type StyleGuideTarget = "none" | "current" | "dedicated";

export interface GenerateRequest {
  /** Name of the Variable Collection AND the shared paint-style folder
   * prefix — one name organizes both, per collectionMode below. */
  collectionName: string;
  ramps: Ramp[];
  mode: GenerationMode;
  createDarkMode: boolean;
  styleGuideTarget: StyleGuideTarget;
}

export interface CollectionSummary {
  name: string;
  /** Primitive group names already present, e.g. ["Blue", "Red"] — shown
   * as a hint so picking an existing collection isn't a guess. */
  groupNames: string[];
}

// --- Typography (mirrors the color domain above: same Variables/Styles/
// style-guide-card shape, same collection picker — a Figma Variable
// Collection isn't type-restricted, so type-scale FLOAT variables can
// live in the same collection as color primitives if the user picks an
// existing one). ---

export const SCALE_RATIOS = [
  { value: 1.067, label: "Minor Second" },
  { value: 1.125, label: "Major Second" },
  { value: 1.2, label: "Minor Third" },
  { value: 1.25, label: "Major Third" },
  { value: 1.333, label: "Perfect Fourth" },
  { value: 1.414, label: "Augmented Fourth" },
  { value: 1.5, label: "Perfect Fifth" },
  { value: 1.618, label: "Golden Ratio" },
] as const;

export type Breakpoint = "desktop" | "tablet" | "mobile";
export const BREAKPOINTS: Breakpoint[] = ["desktop", "tablet", "mobile"];
export const BREAKPOINT_LABELS: Record<Breakpoint, string> = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
};

/** Each active breakpoint has its OWN base size and ratio — real designers
 * don't scale desktop and mobile with the same ratio (e.g. Major Third on
 * desktop, Minor Third on mobile), so this isn't one global scale scaled
 * down, it's genuinely independent per breakpoint. */
export interface BreakpointConfig {
  baseSize: number;
  ratio: number;
}

export interface FontEntry {
  id: string;
  family: string;
  weight: string;
}

export type StepCategory = "heading" | "body" | "other";

/** A single per-breakpoint value for a heading step. */
export interface BreakpointValue {
  px: number;
  lineHeight: number;
}

/**
 * A single named type step — e.g. "H1" or "Body". `category` is derived
 * from `name` (H1-H6 -> "heading", anything containing "body" -> "body",
 * everything else is its own "other" group) and decides two real things,
 * not just cosmetics: only "heading" steps vary per breakpoint — this was
 * an explicit constraint ("only for h1 to h6; no body text, no label,
 * caption, or anything") — so "body"/"other" steps carry a single value
 * in `single` and ignore `byBreakpoint` entirely.
 */
export interface TypeStepInput {
  id: string;
  name: string;
  category: StepCategory;
  /** One or more user-added family/weight pairs to generate for this step. */
  fontEntryIds: string[];
  /** Populated for every active breakpoint when category is "heading". */
  byBreakpoint: Partial<Record<Breakpoint, BreakpointValue>>;
  /** The one value used when category is "body" or "other". */
  single: BreakpointValue;
}

export interface ResolvedBreakpointValue extends BreakpointValue {
  rem: number;
}

export interface ResolvedTypeStep {
  id: string;
  name: string;
  category: StepCategory;
  /** The category's Figma variable group — "Heading", "Body", or the
   * step's own name for "other" (e.g. "Label", "Caption"). */
  group: string;
  /** Every real Figma font style selected for this step. */
  fontStyles: FontEntry[];
  byBreakpoint: Partial<Record<Breakpoint, ResolvedBreakpointValue>>;
  single: ResolvedBreakpointValue;
}

export interface TypeScaleResult {
  activeBreakpoints: Breakpoint[];
  breakpointConfigs: Partial<Record<Breakpoint, BreakpointConfig>>;
  gridSize: number;
  fonts: FontEntry[];
  steps: ResolvedTypeStep[];
}

export interface TypeGenerateRequest {
  collectionName: string;
  /** Font family and weight values can live independently from responsive
   * size variables, so they never create Desktop/Tablet/Mobile modes. */
  fontCollectionName: string;
  scale: TypeScaleResult;
  mode: GenerationMode;
  styleGuideTarget: StyleGuideTarget;
}

/** Messages sent from the UI thread to the main thread. */
export type UiToMainMessage =
  | { type: "generate"; payload: GenerateRequest }
  | { type: "generate-type"; payload: TypeGenerateRequest }
  | { type: "list-collections" }
  | { type: "cancel" };

/** Messages sent from the main thread to the UI thread. */
export type MainToUiMessage =
  | { type: "progress"; payload: { percent: number; label: string } }
  | { type: "generate-complete"; payload: { collectionName: string; variableCount: number; styleCount: number } }
  | { type: "generate-error"; payload: { message: string } }
  | { type: "collections-list"; payload: { collections: CollectionSummary[] } };

export interface FigmaPluginMessageEvent<T> {
  pluginMessage: T;
}
