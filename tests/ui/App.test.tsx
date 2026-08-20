// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { App } from "../../src/ui/App";
import { useTonecraftStore } from "../../src/ui/state/store";
import { wcagContrast } from "culori";

const __dirname = dirname(fileURLToPath(import.meta.url));

// This UI test only exercises React wiring/reactivity, not color math
// (that's covered end to end by tests/color/*, which run in plain Node).
// @material/material-color-utilities has broken internal extensionless
// imports that Vitest's jsdom-environment module graph doesn't tolerate
// even with the ssr dep optimizer workaround used elsewhere in this repo
// — mocking the wrapper here avoids depending on that package's resolution
// at all for a test that was never exercising it.
vi.mock("../../src/color/materialPalette", () => ({
  generateMaterialPalette: vi.fn(() => {
    throw new Error("not exercised by this test suite");
  }),
}));

// Figma's plugin iframe exposes `parent.postMessage` for talking to the
// main thread — stub it so the component doesn't crash under jsdom, and so
// we can assert on exactly what the UI sends.
const postMessageSpy = vi.fn();

beforeEach(() => {
  postMessageSpy.mockClear();
  vi.stubGlobal("parent", { postMessage: postMessageSpy });
  useTonecraftStore.getState().resetForm();
  useTonecraftStore.setState({
    existingCollections: [],
    selectedCollectionName: null,
    collectionMode: "new",
    screen: "generate",
    optionsExpanded: false,
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("renders without crashing and shows the default color entry", () => {
    render(<App />);
    expect(screen.getByText("Tonecraft")).toBeTruthy();
    expect(screen.getByDisplayValue("Primary")).toBeTruthy();
  });

  it("requests the collection list on mount", () => {
    render(<App />);
    expect(postMessageSpy).toHaveBeenCalledWith({ pluginMessage: { type: "list-collections" } }, "*");
  });

  it("updates the live preview immediately when the hex input changes — regression test for the reactivity bug", () => {
    render(<App />);
    const hexInput = screen.getByPlaceholderText("#4F46E5");

    fireEvent.change(hexInput, { target: { value: "#16A34A" } });

    // The big preview panel should reflect the new color right away —
    // proving the derived ramp recomputed without needing an unrelated
    // field (like switching generation mode) to force a re-render, which
    // was the bug.
    const sourceSwatch = document.querySelector('.big-ramp-swatch[title*="#16a34a"]');
    expect(sourceSwatch).not.toBeNull();
  });

  it("adds a new color row when a preset chip is clicked", () => {
    render(<App />);
    fireEvent.click(screen.getByText("Error"));
    const nameInputs = screen.getAllByLabelText("Color group name") as HTMLInputElement[];
    expect(nameInputs.map((i) => i.value)).toContain("Error");
    expect(nameInputs).toHaveLength(2);
  });

  it("disables Generate until every color entry is valid", () => {
    render(<App />);
    expect((screen.getByRole("button", { name: /^Generate/ }) as HTMLButtonElement).disabled).toBe(false);

    fireEvent.change(screen.getByPlaceholderText("#4F46E5"), { target: { value: "not-a-color" } });
    expect((screen.getByRole("button", { name: /^Generate/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("sends a generate message with the resolved collection name and all valid ramps", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /^Generate/ }));

    const call = postMessageSpy.mock.calls.find((c) => c[0]?.pluginMessage?.type === "generate");
    expect(call).toBeTruthy();
    const payload = call![0].pluginMessage.payload;
    expect(payload.collectionName).toBe("Design Tokens");
    expect(payload.ramps).toHaveLength(1);
    expect(payload.ramps[0].name).toBe("Primary");
  });

  it("keeps the Color Wheel inside Generate and switches to Type Scale from top navigation", () => {
    render(<App />);
    expect(screen.getByLabelText("Color group name")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Color wheel" }));
    expect(screen.getByLabelText("Brand color hex")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Type Scale" }));
    expect(screen.getByLabelText("Round to grid (px)")).toBeTruthy();
  });

  it("keeps generation state alive when switching away from the Generate screen mid-run", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /^Generate/ }));
    expect(useTonecraftStore.getState().status).toBe("generating");

    fireEvent.click(screen.getByRole("tab", { name: "Color wheel" }));
    // The message listener lives in App, not GenerateScreen, so it's still
    // mounted and status isn't reset just because the screen changed.
    expect(useTonecraftStore.getState().status).toBe("generating");
  });

  it("Options are visible by default, not collapsed — 'open all features' requirement", () => {
    render(<App />);
    expect(screen.getByLabelText("Collection target")).toBeTruthy();
    expect(screen.getByLabelText("Generation mode")).toBeTruthy();
  });
  it("defaults to reusing an existing collection once one is reported by the main thread", () => {
    render(<App />);
    useTonecraftStore.getState().setExistingCollections([{ name: "Design Tokens", groupNames: ["Blue"] }]);
    expect(useTonecraftStore.getState().collectionMode).toBe("existing");
    expect(useTonecraftStore.getState().activeCollectionName()).toBe("Design Tokens");
  });

  it("never uses a literal pure black or white theme token in styles.css", () => {
    // App.tsx doesn't import styles.css itself (only main.tsx does), so
    // this reads the real file rather than asserting against a <style> tag
    // that wouldn't exist in this render tree.
    const css = readFileSync(resolve(__dirname, "../../src/ui/styles.css"), "utf-8");
    const themeTokenLine = /--(bg|surface|text-primary|accent-text-on-accent):\s*(#fff(fff)?|#000(000)?|white|black)\s*;/i;
    expect(themeTokenLine.test(css)).toBe(false);
  });

  it("uses the exact requested colors, and every pairing clears its real WCAG 2.1 minimum", () => {
    const css = readFileSync(resolve(__dirname, "../../src/ui/styles.css"), "utf-8");
    const token = (name: string) => {
      const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
      if (!match) throw new Error(`Token --${name} not found in styles.css`);
      return match[1];
    };

    expect(token("bg")).toBe("#2c2c2c");
    expect(token("text-primary")).toBe("#f5f5f5");
    expect(token("accent")).toBe("#f5f5f5");
    expect(token("accent-text-on-accent")).toBe("#2c2c2c");

    // Normal text (< 18pt): needs 4.5:1 minimum (WCAG 2.1 SC 1.4.3).
    expect(wcagContrast(token("bg"), token("text-primary"))).toBeGreaterThanOrEqual(4.5);
    expect(wcagContrast(token("accent"), token("accent-text-on-accent"))).toBeGreaterThanOrEqual(4.5);
    expect(wcagContrast(token("bg"), token("text-secondary"))).toBeGreaterThanOrEqual(4.5);

    // Non-text UI component boundaries (input borders): 3:1 minimum
    // (WCAG 2.1 SC 1.4.11), not the higher text threshold.
    expect(wcagContrast(token("border"), token("bg"))).toBeGreaterThanOrEqual(3);
  });
});
