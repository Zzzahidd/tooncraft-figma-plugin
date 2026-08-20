import { create } from "zustand";
import type {
  Algorithm,
  Breakpoint,
  BreakpointConfig,
  BreakpointValue,
  CollectionSummary,
  FontEntry,
  GenerationMode,
  StyleGuideTarget,
  TypeStepInput,
} from "../../shared/types";
import type { HarmonyScheme } from "../../color/harmony";
import { generateDefaultSteps, makeAdjacentStep, seedBreakpointValues, categorizeStepName } from "../../type/typeScale";

export type GenerateStatus = "idle" | "generating" | "success" | "error";
export type CollectionMode = "existing" | "new";
export type Screen = "generate" | "type";

export interface ColorEntry {
  id: string;
  name: string;
  hex: string;
}

// A handful of common semantic categories so a beginner can build out a
// full token set by clicking rather than inventing names/colors from
// scratch. Colors are reasonable OKLCH-even starting points, not final say.
export const COLOR_PRESETS: Omit<ColorEntry, "id">[] = [
  { name: "Primary", hex: "#4F46E5" },
  { name: "Secondary", hex: "#0EA5E9" },
  { name: "Neutral", hex: "#71717A" },
  { name: "Success", hex: "#16A34A" },
  { name: "Warning", hex: "#D97706" },
  { name: "Error", hex: "#DC2626" },
  { name: "Info", hex: "#2563EB" },
];

let idCounter = 0;
function nextId(prefix = "entry"): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

const DEFAULT_BREAKPOINT_CONFIGS: Partial<Record<Breakpoint, BreakpointConfig>> = {
  desktop: { baseSize: 16, ratio: 1.25 },
  tablet: { baseSize: 15, ratio: 1.2 },
  mobile: { baseSize: 14, ratio: 1.2 },
};

const DEFAULT_FONTS: FontEntry[] = [{ id: nextId("font"), family: "Inter", weight: "Regular" }];

interface TonecraftState {
  screen: Screen;
  setScreen: (screen: Screen) => void;

  colorEntries: ColorEntry[];
  algorithm: Algorithm;
  mode: GenerationMode;
  createDarkMode: boolean;
  styleGuideTarget: StyleGuideTarget;
  wheelBaseHex: string;
  setWheelBaseHex: (hex: string) => void;
  wheelScheme: HarmonyScheme;
  setWheelScheme: (scheme: HarmonyScheme) => void;

  collectionMode: CollectionMode;
  selectedCollectionName: string | null;
  newCollectionName: string;
  existingCollections: CollectionSummary[];

  // --- Type Scale ---
  activeBreakpoints: Breakpoint[];
  breakpointConfigs: Partial<Record<Breakpoint, BreakpointConfig>>;
  toggleBreakpoint: (bp: Breakpoint) => void;
  setBreakpointConfig: (bp: Breakpoint, patch: Partial<BreakpointConfig>) => void;

  typeGridSize: number;
  setTypeGridSize: (size: number) => void;

  typeFonts: FontEntry[];
  addTypeFont: () => void;
  updateTypeFont: (id: string, patch: Partial<Omit<FontEntry, "id">>) => void;
  removeTypeFont: (id: string) => void;

  typeSteps: TypeStepInput[];
  addLargerTypeStep: () => void;
  addSmallerTypeStep: () => void;
  updateTypeStep: (id: string, patch: Partial<Pick<TypeStepInput, "name" | "fontEntryIds">>) => void;
  updateTypeStepValue: (id: string, target: Breakpoint | "single", patch: Partial<BreakpointValue>) => void;
  removeTypeStep: (id: string) => void;
  reorderTypeSteps: (fromId: string, toId: string) => void;

  typeMode: GenerationMode;
  setTypeMode: (mode: GenerationMode) => void;
  typeStyleGuideTarget: StyleGuideTarget;
  setTypeStyleGuideTarget: (target: StyleGuideTarget) => void;

  typeCollectionMode: CollectionMode;
  setTypeCollectionMode: (mode: CollectionMode) => void;
  typeSelectedCollectionName: string | null;
  setTypeSelectedCollectionName: (name: string | null) => void;
  typeNewCollectionName: string;
  setTypeNewCollectionName: (name: string) => void;
  typeFontCollectionMode: CollectionMode;
  setTypeFontCollectionMode: (mode: CollectionMode) => void;
  typeFontSelectedCollectionName: string | null;
  setTypeFontSelectedCollectionName: (name: string | null) => void;
  typeFontNewCollectionName: string;
  setTypeFontNewCollectionName: (name: string) => void;

  status: GenerateStatus;
  progress: { percent: number; label: string } | null;
  errorMessage: string | null;

  addColorEntry: (preset?: Omit<ColorEntry, "id">) => void;
  updateColorEntry: (id: string, patch: Partial<Omit<ColorEntry, "id">>) => void;
  removeColorEntry: (id: string) => void;

  setAlgorithm: (algorithm: Algorithm) => void;
  setMode: (mode: GenerationMode) => void;
  setCreateDarkMode: (value: boolean) => void;
  setStyleGuideTarget: (target: StyleGuideTarget) => void;

  setCollectionMode: (mode: CollectionMode) => void;
  setSelectedCollectionName: (name: string | null) => void;
  setNewCollectionName: (name: string) => void;
  setExistingCollections: (collections: CollectionSummary[]) => void;

  setProgress: (progress: { percent: number; label: string } | null) => void;
  setStatus: (status: GenerateStatus) => void;
  setErrorMessage: (message: string | null) => void;
  resetForm: () => void;
  resetTypeForm: () => void;

  /** Resolved collection name to actually send to the main thread. */
  activeCollectionName: () => string;
  activeTypeCollectionName: () => string;
  activeTypeFontCollectionName: () => string;
}

const DEFAULT_ENTRIES: ColorEntry[] = [{ id: nextId(), name: "Primary", hex: "#4F46E5" }];

export const useTonecraftStore = create<TonecraftState>((set, get) => ({
  screen: "generate",
  setScreen: (screen) => set({ screen }),

  colorEntries: DEFAULT_ENTRIES,
  algorithm: "tailwind-oklch",
  mode: "both",
  createDarkMode: true,
  styleGuideTarget: "dedicated",
  wheelBaseHex: "#4F46E5",
  setWheelBaseHex: (hex) => set({ wheelBaseHex: hex }),
  wheelScheme: "complementary",
  setWheelScheme: (wheelScheme) => set({ wheelScheme }),

  collectionMode: "new",
  selectedCollectionName: null,
  newCollectionName: "Design Tokens",
  existingCollections: [],

  activeBreakpoints: ["desktop"],
  breakpointConfigs: DEFAULT_BREAKPOINT_CONFIGS,

  toggleBreakpoint: (bp) =>
    set((state) => {
      const isActive = state.activeBreakpoints.includes(bp);

      if (isActive) {
        // Guard: at least one breakpoint must stay active.
        if (state.activeBreakpoints.length === 1) return state;
        return { activeBreakpoints: state.activeBreakpoints.filter((b) => b !== bp) };
      }

      const nextActive = [...state.activeBreakpoints, bp];
      // Seed any heading step that doesn't yet have a value for the
      // newly-enabled breakpoint, copying from whichever breakpoint value
      // it already has — same "starting point, not a cage" principle as
      // everywhere else; fully editable immediately after.
      const config = state.breakpointConfigs[bp] ?? { baseSize: 16, ratio: 1.25 };
      const typeSteps = state.typeSteps.map((step) => {
        if (step.category !== "heading" || step.byBreakpoint[bp]) return step;
        const fallback = Object.values(step.byBreakpoint)[0] ?? { px: config.baseSize, lineHeight: 1.5 };
        return { ...step, byBreakpoint: { ...step.byBreakpoint, [bp]: { ...fallback } } };
      });

      return { activeBreakpoints: nextActive, typeSteps };
    }),

  setBreakpointConfig: (bp, patch) =>
    set((state) => ({
      breakpointConfigs: {
        ...state.breakpointConfigs,
        [bp]: { ...(state.breakpointConfigs[bp] ?? { baseSize: 16, ratio: 1.25 }), ...patch },
      },
    })),

  typeGridSize: 4,
  setTypeGridSize: (size) => set({ typeGridSize: size }),

  typeFonts: DEFAULT_FONTS,

  addTypeFont: () =>
    set((state) => ({
      typeFonts: [...state.typeFonts, { id: nextId("font"), family: "Inter", weight: "Regular" }],
    })),

  updateTypeFont: (id, patch) =>
    set((state) => ({
      typeFonts: state.typeFonts.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    })),

  removeTypeFont: (id) =>
    set((state) => {
      if (state.typeFonts.length === 1) return state;
      const remaining = state.typeFonts.filter((f) => f.id !== id);
      const fallbackId = remaining[0].id;
      return {
        typeFonts: remaining,
        // Remove this style from every step; a step always retains at least
        // one valid font style so it can still produce a real Figma sample.
        typeSteps: state.typeSteps.map((step) => {
          const fontEntryIds = step.fontEntryIds.filter((fontId) => fontId !== id);
          return { ...step, fontEntryIds: fontEntryIds.length > 0 ? fontEntryIds : [fallbackId] };
        }),
      };
    }),

  typeSteps: generateDefaultSteps(["desktop"], DEFAULT_BREAKPOINT_CONFIGS, 4, DEFAULT_FONTS[0].id),

  addLargerTypeStep: () =>
    set((state) => {
      const step = makeAdjacentStep(
        "New larger step",
        "larger",
        state.typeSteps,
        state.activeBreakpoints,
        state.breakpointConfigs,
        state.typeGridSize,
        state.typeFonts[0].id,
      );
      return { typeSteps: [step, ...state.typeSteps] };
    }),

  addSmallerTypeStep: () =>
    set((state) => {
      const step = makeAdjacentStep(
        "New smaller step",
        "smaller",
        state.typeSteps,
        state.activeBreakpoints,
        state.breakpointConfigs,
        state.typeGridSize,
        state.typeFonts[0].id,
      );
      return { typeSteps: [...state.typeSteps, step] };
    }),

  updateTypeStep: (id, patch) =>
    set((state) => ({
      typeSteps: state.typeSteps.map((step) => {
        if (step.id !== id) return step;
        const updated = { ...step, ...patch };
        // If a rename turns this into a heading and it has no
        // per-breakpoint values yet, seed them from the single value so
        // the fields have something sensible rather than being empty.
        if (patch.name !== undefined) {
          const { category } = categorizeStepName(updated.name);
          if (category === "heading" && Object.keys(updated.byBreakpoint).length === 0) {
            updated.byBreakpoint = seedBreakpointValues(updated, state.activeBreakpoints);
          }
        }
        return updated;
      }),
    })),

  updateTypeStepValue: (id, target, patch) =>
    set((state) => ({
      typeSteps: state.typeSteps.map((step) => {
        if (step.id !== id) return step;
        if (target === "single") {
          return { ...step, single: { ...step.single, ...patch } };
        }
        const current = step.byBreakpoint[target] ?? { px: step.single.px, lineHeight: step.single.lineHeight };
        return { ...step, byBreakpoint: { ...step.byBreakpoint, [target]: { ...current, ...patch } } };
      }),
    })),

  removeTypeStep: (id) =>
    set((state) => ({
      typeSteps: state.typeSteps.length > 1 ? state.typeSteps.filter((s) => s.id !== id) : state.typeSteps,
    })),

  reorderTypeSteps: (fromId, toId) =>
    set((state) => {
      if (fromId === toId) return state;
      const steps = [...state.typeSteps];
      const fromIndex = steps.findIndex((s) => s.id === fromId);
      const toIndex = steps.findIndex((s) => s.id === toId);
      if (fromIndex === -1 || toIndex === -1) return state;
      const [moved] = steps.splice(fromIndex, 1);
      steps.splice(toIndex, 0, moved);
      return { typeSteps: steps };
    }),

  typeMode: "both",
  setTypeMode: (typeMode) => set({ typeMode }),
  typeStyleGuideTarget: "dedicated",
  setTypeStyleGuideTarget: (target) => set({ typeStyleGuideTarget: target }),

  typeCollectionMode: "new",
  setTypeCollectionMode: (typeCollectionMode) => set({ typeCollectionMode }),
  typeSelectedCollectionName: null,
  setTypeSelectedCollectionName: (name) => set({ typeSelectedCollectionName: name }),
  typeNewCollectionName: "Design Tokens",
  setTypeNewCollectionName: (name) => set({ typeNewCollectionName: name }),
  typeFontCollectionMode: "new",
  setTypeFontCollectionMode: (typeFontCollectionMode) => set({ typeFontCollectionMode }),
  typeFontSelectedCollectionName: null,
  setTypeFontSelectedCollectionName: (name) => set({ typeFontSelectedCollectionName: name }),
  typeFontNewCollectionName: "Font Tokens",
  setTypeFontNewCollectionName: (typeFontNewCollectionName) => set({ typeFontNewCollectionName }),

  status: "idle",
  progress: null,
  errorMessage: null,

  addColorEntry: (preset) =>
    set((state) => ({
      colorEntries: [
        ...state.colorEntries,
        preset ? { ...preset, id: nextId() } : { id: nextId(), name: "", hex: "#71717A" },
      ],
    })),

  updateColorEntry: (id, patch) =>
    set((state) => ({
      colorEntries: state.colorEntries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    })),

  removeColorEntry: (id) =>
    set((state) => ({
      colorEntries: state.colorEntries.length > 1 ? state.colorEntries.filter((e) => e.id !== id) : state.colorEntries,
    })),

  setAlgorithm: (algorithm) => set({ algorithm }),
  setMode: (mode) => set({ mode }),
  setCreateDarkMode: (value) => set({ createDarkMode: value }),
  setStyleGuideTarget: (target) => set({ styleGuideTarget: target }),

  setCollectionMode: (collectionMode) => set({ collectionMode }),
  setSelectedCollectionName: (name) => set({ selectedCollectionName: name }),
  setNewCollectionName: (name) => set({ newCollectionName: name }),
  setExistingCollections: (collections) =>
    set((state) => ({
      existingCollections: collections,
      // If nothing's selected yet and a collection already exists, default
      // to reusing it — reusing one shared collection is the behavior most
      // people want, not creating a new one every session.
      collectionMode: state.selectedCollectionName === null && collections.length > 0 ? "existing" : state.collectionMode,
      selectedCollectionName: state.selectedCollectionName ?? (collections[0]?.name ?? null),
      typeCollectionMode:
        state.typeSelectedCollectionName === null && collections.length > 0 ? "existing" : state.typeCollectionMode,
      typeSelectedCollectionName: state.typeSelectedCollectionName ?? (collections[0]?.name ?? null),
      typeFontCollectionMode:
        state.typeFontSelectedCollectionName === null && collections.length > 0 ? "existing" : state.typeFontCollectionMode,
      typeFontSelectedCollectionName: state.typeFontSelectedCollectionName ?? (collections[0]?.name ?? null),
    })),

  setProgress: (progress) => set({ progress }),
  setStatus: (status) => set({ status }),
  setErrorMessage: (message) => set({ errorMessage: message }),

  resetForm: () =>
    set({
      colorEntries: [{ id: nextId(), name: "Primary", hex: "#4F46E5" }],
      algorithm: "tailwind-oklch",
      mode: "both",
      createDarkMode: true,
      styleGuideTarget: "dedicated",
      status: "idle",
      progress: null,
      errorMessage: null,
    }),

  resetTypeForm: () =>
    set({
      activeBreakpoints: ["desktop"],
      breakpointConfigs: DEFAULT_BREAKPOINT_CONFIGS,
      typeGridSize: 4,
      typeFonts: DEFAULT_FONTS,
      typeSteps: generateDefaultSteps(["desktop"], DEFAULT_BREAKPOINT_CONFIGS, 4, DEFAULT_FONTS[0].id),
      typeMode: "both",
      typeStyleGuideTarget: "dedicated",
      typeFontCollectionMode: "new",
      typeFontSelectedCollectionName: null,
      typeFontNewCollectionName: "Font Tokens",
      status: "idle",
      progress: null,
      errorMessage: null,
    }),

  activeCollectionName: () => {
    const state = get();
    if (state.collectionMode === "existing" && state.selectedCollectionName) {
      return state.selectedCollectionName;
    }
    return state.newCollectionName.trim() || "Design Tokens";
  },

  activeTypeCollectionName: () => {
    const state = get();
    if (state.typeCollectionMode === "existing" && state.typeSelectedCollectionName) {
      return state.typeSelectedCollectionName;
    }
    return state.typeNewCollectionName.trim() || "Design Tokens";
  },

  activeTypeFontCollectionName: () => {
    const state = get();
    if (state.typeFontCollectionMode === "existing" && state.typeFontSelectedCollectionName) {
      return state.typeFontSelectedCollectionName;
    }
    return state.typeFontNewCollectionName.trim() || "Font Tokens";
  },
}));
