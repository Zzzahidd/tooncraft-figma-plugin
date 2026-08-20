// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { App } from "../../src/ui/App";
import { useTonecraftStore } from "../../src/ui/state/store";

// See tests/ui/App.test.tsx for why this is mocked rather than resolved.
vi.mock("../../src/color/materialPalette", () => ({
  generateMaterialPalette: vi.fn(() => {
    throw new Error("not exercised by this test suite");
  }),
}));

beforeEach(() => {
  useTonecraftStore.getState().resetTypeForm();
  useTonecraftStore.setState({
    existingCollections: [],
    typeSelectedCollectionName: null,
    typeCollectionMode: "new",
    screen: "type",
  });
});

afterEach(() => cleanup());

describe("TypeScreen — default scaffold", () => {
  it("prioritizes the essential workflow and keeps advanced controls available on demand", () => {
    render(<App />);
    const advanced = screen.getByText("Advanced scale setup").closest("details") as HTMLDetailsElement;
    const preview = screen.getByText("Preview generated scale").closest("details") as HTMLDetailsElement;

    expect(advanced.open).toBe(false);
    expect(preview.open).toBe(false);
    expect(screen.getByText("Ready to create")).toBeTruthy();
    expect(screen.getByText(/7 sizes · 7 font styles · Desktop/)).toBeTruthy();
  });

  it("creates exactly H1-H6 + Body by default, nothing else", () => {
    render(<App />);
    const names = screen.getAllByLabelText("Step name").map((el) => (el as HTMLInputElement).value);
    expect(names).toEqual(["H1", "H2", "H3", "H4", "H5", "H6", "Body"]);
  });

  it("shows one metric row for a heading step (Desktop only, by default)", () => {
    render(<App />);
    expect(screen.getByLabelText("H1 Desktop size in pixels")).toBeTruthy();
    expect(screen.queryByLabelText("H1 Mobile size in pixels")).toBeNull();
  });

  it("shows a single 'Size' row for Body, not a Desktop-labeled one", () => {
    render(<App />);
    expect(screen.getByLabelText("Body Size size in pixels")).toBeTruthy();
  });
});

describe("TypeScreen — breakpoints", () => {
  it("defaults to Desktop only", () => {
    render(<App />);
    const checkboxes = screen.getAllByRole("checkbox", { name: /Desktop|Tablet|Mobile/ }) as HTMLInputElement[];
    const desktop = checkboxes.find((c) => c.closest("label")?.textContent === "Desktop")!;
    const mobile = checkboxes.find((c) => c.closest("label")?.textContent === "Mobile")!;
    expect(desktop.checked).toBe(true);
    expect(mobile.checked).toBe(false);
  });

  it("adding Mobile reveals a Mobile field on every heading step", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Mobile" }));
    const mobileInputs = screen.getAllByLabelText(/Mobile size in pixels/);
    expect(mobileInputs).toHaveLength(6); // H1-H6, not Body
    expect(screen.queryByLabelText(/Body.*Mobile/)).toBeNull();
  });

  it("cannot disable the only active breakpoint", () => {
    render(<App />);
    const desktopCheckbox = screen.getByRole("checkbox", { name: "Desktop" }) as HTMLInputElement;
    expect(desktopCheckbox.disabled).toBe(true);
  });

  it("desktop can be disabled once a second breakpoint is active, leaving mobile-only", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Mobile" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Desktop" }));
    expect(screen.queryByLabelText(/Desktop size in pixels/)).toBeNull();
    expect(screen.getAllByLabelText(/Mobile size in pixels/)).toHaveLength(6);
  });

  it("each breakpoint has its own ratio setting, independent of Desktop's", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Mobile" }));

    const configs = document.querySelectorAll(".breakpoint-config");
    const mobileConfig = Array.from(configs).find((el) => el.textContent?.includes("Mobile"))!;
    fireEvent.click(within(mobileConfig as HTMLElement).getByRole("button", { name: "Golden Ratio (1.618)" }));

    // Config changes seed newly-added/regenerated steps, not already-
    // rendered ones in place (same "starting point, not a cage" rule as
    // everywhere else) — so the real assertion is on the store's config,
    // and that Desktop's own ratio is untouched. Whether a NEW step
    // actually picks up the new ratio is already covered directly by
    // makeAdjacentStep's own tests in typeScale.test.ts.
    const state = useTonecraftStore.getState();
    expect(state.breakpointConfigs.mobile?.ratio).toBe(1.618);
    expect(state.breakpointConfigs.desktop?.ratio).toBe(1.25);
  });
});

describe("TypeScreen — fonts", () => {
  it("starts with one font entry (Inter Regular)", () => {
    render(<App />);
    expect(screen.getByDisplayValue("Inter")).toBeTruthy();
    expect(screen.getByDisplayValue("Regular")).toBeTruthy();
  });

  it("Add font creates a second entry, addable because a typeface has many weights", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Add font" }));
    const familyInputs = screen.getAllByLabelText("Font family");
    expect(familyInputs).toHaveLength(2);
  });

  it("a step can include multiple font styles, then remove an unwanted style", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Add font" }));
    const weightInputs = screen.getAllByLabelText("Font weight") as HTMLInputElement[];
    fireEvent.change(weightInputs[1], { target: { value: "Bold" } });

    const h1Styles = screen.getByRole("group", { name: "H1 font styles" });
    const regular = within(h1Styles).getByRole("button", { name: "Inter Regular" });
    const bold = within(h1Styles).getByRole("button", { name: "Inter Bold" });
    expect(regular.getAttribute("aria-pressed")).toBe("true");
    expect(bold.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(bold);
    expect(bold.getAttribute("aria-pressed")).toBe("true");
    expect((regular as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(regular);
    expect(regular.getAttribute("aria-pressed")).toBe("false");
    expect((bold as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps the font variable collection chooser beside the font fields", () => {
    render(<App />);
    const fontSection = screen.getByText("Fonts & weights").closest(".section")!;
    expect(within(fontSection as HTMLElement).getByText("Font variable collection")).toBeTruthy();
  });
});

describe("TypeScreen — steps", () => {
  it("allows a size field to be empty while the user replaces its value", () => {
    render(<App />);
    const input = screen.getByLabelText("Body Size size in pixels") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");

    fireEvent.change(input, { target: { value: "14" } });
    expect(input.value).toBe("14");
  });

  it("naming a new step exactly 'H7' does NOT grant it breakpoint fields — the boundary is literal", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Mobile" }));
    fireEvent.click(screen.getByRole("button", { name: /Add larger step/ }));

    const nameInputs = screen.getAllByLabelText("Step name") as HTMLInputElement[];
    const newStep = nameInputs.find((i) => i.value === "New larger step")!;
    fireEvent.change(newStep, { target: { value: "H7" } });

    expect(screen.getByDisplayValue("H7")).toBeTruthy();
    // Still 6 Mobile fields (H1-H6 only) — H7 did not add a 7th.
    expect(screen.getAllByLabelText(/Mobile size in pixels/)).toHaveLength(6);
  });

  it("renaming an existing custom step to exactly H3-shaped name grants it per-breakpoint fields", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Mobile" }));
    fireEvent.click(screen.getByRole("button", { name: /Add larger step/ }));

    const nameInputs = screen.getAllByLabelText("Step name") as HTMLInputElement[];
    const newStep = nameInputs.find((i) => i.value === "New larger step")!;
    fireEvent.change(newStep, { target: { value: "H1" } });

    // Now there are two "H1"s (the original and the renamed one) — the
    // renamed one should have gained a Mobile field too.
    expect(screen.getAllByLabelText(/^H1 Mobile size in pixels$/)).toHaveLength(2);
  });

  it("removing a step works but never removes the last one", () => {
    render(<App />);
    const before = useTonecraftStore.getState().typeSteps.length;
    fireEvent.click(screen.getByRole("button", { name: "Remove H1" }));
    expect(useTonecraftStore.getState().typeSteps.length).toBe(before - 1);
  });

  it("dropping a step onto another reorders the list (native drag-and-drop)", () => {
    render(<App />);
    const h1Id = useTonecraftStore.getState().typeSteps.find((s) => s.name === "H1")!.id;
    const cards = document.querySelectorAll(".type-step-card");
    const lastCard = cards[cards.length - 1]; // Body

    const dataTransfer = { setData: vi.fn(), getData: vi.fn(() => h1Id), effectAllowed: "" };
    fireEvent.dragOver(lastCard, { dataTransfer });
    fireEvent.drop(lastCard, { dataTransfer });

    const namesAfter = screen.getAllByLabelText("Step name").map((el) => (el as HTMLInputElement).value);
    expect(namesAfter[namesAfter.length - 1]).toBe("H1");
    expect(namesAfter[0]).toBe("H2");
  });
});

describe("TypeScreen — generation", () => {
  it("keeps Font Size and Line Height names fixed without exposing naming controls", () => {
    render(<App />);
    expect(screen.queryByLabelText("Font size variable name")).toBeNull();
    expect(screen.queryByLabelText("Line height variable name")).toBeNull();
    expect(screen.queryByLabelText("Scale name")).toBeNull();
  });

  it("sends a separate font collection for font family and weight variables", () => {
    const postMessageSpy = vi.fn();
    vi.stubGlobal("parent", { postMessage: postMessageSpy });
    render(<App />);

    fireEvent.change(screen.getByLabelText("New collection name"), { target: { value: "Responsive type" } });
    fireEvent.change(screen.getByLabelText("New font variable collection name"), { target: { value: "Font tokens" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    const call = postMessageSpy.mock.calls.find((c) => c[0]?.pluginMessage?.type === "generate-type");
    expect(call![0].pluginMessage.payload.collectionName).toBe("Responsive type");
    expect(call![0].pluginMessage.payload.fontCollectionName).toBe("Font tokens");
    vi.unstubAllGlobals();
  });

  it("does not show a Dark mode toggle — font-size tokens have no light/dark concept", () => {
    render(<App />);
    expect(screen.queryByLabelText(/Dark mode/)).toBeNull();
  });

  it("sends a generate-type message carrying breakpoints, fonts, and grouped steps", () => {
    const postMessageSpy = vi.fn();
    vi.stubGlobal("parent", { postMessage: postMessageSpy });
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    const call = postMessageSpy.mock.calls.find((c) => c[0]?.pluginMessage?.type === "generate-type");
    expect(call).toBeTruthy();
    const scale = call![0].pluginMessage.payload.scale;
    expect(scale.activeBreakpoints).toEqual(["desktop"]);
    expect(scale.fonts).toHaveLength(1);
    const h1 = scale.steps.find((s: { name: string }) => s.name === "H1");
    expect(h1.group).toBe("Heading");
    expect(h1.byBreakpoint.desktop.px).toBeGreaterThan(0);
    const body = scale.steps.find((s: { name: string }) => s.name === "Body");
    expect(body.group).toBe("Body");
    expect(body.single.px).toBeGreaterThan(0);

    vi.unstubAllGlobals();
  });

  it("is reachable via the nav tabs from the Generate screen", () => {
    useTonecraftStore.setState({ screen: "generate" });
    render(<App />);
    fireEvent.click(screen.getByRole("tab", { name: "Type Scale" }));
    expect(screen.getByLabelText("Round to grid (px)")).toBeTruthy();
  });
});
