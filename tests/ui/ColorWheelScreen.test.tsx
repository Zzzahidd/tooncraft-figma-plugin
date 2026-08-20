// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { App } from "../../src/ui/App";
import { useTonecraftStore } from "../../src/ui/state/store";

// See tests/ui/App.test.tsx for why this is mocked rather than resolved.
vi.mock("../../src/color/materialPalette", () => ({
  generateMaterialPalette: vi.fn(() => {
    throw new Error("not exercised by this test suite");
  }),
}));

beforeEach(() => {
  useTonecraftStore.getState().resetForm();
  useTonecraftStore.setState({
    existingCollections: [],
    selectedCollectionName: null,
    collectionMode: "new",
    screen: "generate",
    wheelBaseHex: "#4F46E5",
    wheelScheme: "complementary",
  });
});

afterEach(() => cleanup());

function goToWheel() {
  render(<App />);
  fireEvent.click(screen.getByRole("tab", { name: "Color wheel" }));
}

describe("ColorWheelScreen", () => {
  it("shows the base color plus one complementary color by default", () => {
    goToWheel();
    expect(screen.getByText("Base")).toBeTruthy();
    // "Complementary" appears twice: the scheme-picker button and the
    // result row label — both are expected here.
    expect(screen.getAllByText("Complementary").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("#4F46E5")).toBeTruthy();
  });

  it("switches to a different scheme and shows the right number of results", () => {
    goToWheel();
    fireEvent.click(screen.getByRole("button", { name: "Square" }));
    // Square = 4 colors total: 1 base + 3 harmony, each with its own row.
    expect(screen.getByText("Square A")).toBeTruthy();
    expect(screen.getByText("Square B")).toBeTruthy();
    expect(screen.getByText("Square C")).toBeTruthy();
  });

  it("Tetradic is offered as distinct from Square", () => {
    goToWheel();
    expect(screen.getByRole("button", { name: "Tetradic" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Square" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tetradic" }));
    expect(screen.getByText("Tetradic A")).toBeTruthy();
    expect(screen.getByText("Tetradic B")).toBeTruthy();
    expect(screen.getByText("Tetradic C")).toBeTruthy();
  });

  it("Monochromatic renders a strip instead of the wheel", () => {
    goToWheel();
    fireEvent.click(screen.getByRole("button", { name: "Monochromatic" }));
    expect(screen.getByText("Lightest")).toBeTruthy();
    expect(screen.getByText("Darkest")).toBeTruthy();
    expect(document.querySelector(".color-wheel")).toBeNull();
    expect(document.querySelector(".mono-strip-wrap .ramp-strip")).not.toBeNull();
  });

  it("does not offer an Add button for the base color, only the derived ones", () => {
    goToWheel();
    expect(screen.queryByLabelText("Add Base to the Generate screen")).toBeNull();
    expect(screen.getByLabelText("Add Complementary to the Generate screen")).toBeTruthy();
  });

  it("clicking Add pushes a new color entry into the shared store", () => {
    goToWheel();
    const before = useTonecraftStore.getState().colorEntries.length;

    fireEvent.click(screen.getByLabelText("Add Complementary to the Generate screen"));

    const entries = useTonecraftStore.getState().colorEntries;
    expect(entries.length).toBe(before + 1);
    expect(entries[entries.length - 1].name).toBe("Complementary");
  });

  it("the added entry is immediately usable back on the Generate screen", () => {
    goToWheel();
    fireEvent.click(screen.getByLabelText("Add Complementary to the Generate screen"));

    fireEvent.click(screen.getByRole("tab", { name: "Color list" }));
    expect(screen.getByDisplayValue("Complementary")).toBeTruthy();
  });

  it("shows a validation hint instead of a wheel for an invalid hex", () => {
    useTonecraftStore.setState({ wheelBaseHex: "not-a-color" });
    goToWheel();
    expect(screen.getByText(/Enter a 6-digit hex/)).toBeTruthy();
    // The scheme picker itself always renders — what should disappear is
    // the wheel/results, since there's nothing valid to compute yet.
    expect(document.querySelector(".harmony-results")).toBeNull();
    expect(document.querySelector(".color-wheel")).toBeNull();
  });
});
