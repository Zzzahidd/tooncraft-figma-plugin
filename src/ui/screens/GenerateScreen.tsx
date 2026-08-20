import { useState } from "react";
import { useTonecraftStore } from "../state/store";
import { useRamps } from "../hooks/useRamps";
import { ColorEntryList } from "../components/ColorEntryList";
import { AlgorithmSelector } from "../components/AlgorithmSelector";
import { CollectionSelector } from "../components/CollectionSelector";
import { GenerationOptions } from "../components/GenerationOptions";
import { BigRampPreview } from "../components/BigRampPreview";
import { ColorWheelScreen } from "./ColorWheelScreen";

export function GenerateScreen() {
  const [view, setView] = useState<"colors" | "wheel">("colors");
  const colorEntries = useTonecraftStore((s) => s.colorEntries);
  const algorithm = useTonecraftStore((s) => s.algorithm);
  const mode = useTonecraftStore((s) => s.mode);
  const createDarkMode = useTonecraftStore((s) => s.createDarkMode);
  const styleGuideTarget = useTonecraftStore((s) => s.styleGuideTarget);
  const status = useTonecraftStore((s) => s.status);
  const progress = useTonecraftStore((s) => s.progress);
  const errorMessage = useTonecraftStore((s) => s.errorMessage);
  const setStatus = useTonecraftStore((s) => s.setStatus);
  const setErrorMessage = useTonecraftStore((s) => s.setErrorMessage);
  const activeCollectionName = useTonecraftStore((s) => s.activeCollectionName);
  const resetForm = useTonecraftStore((s) => s.resetForm);
  const collectionMode = useTonecraftStore((s) => s.collectionMode);
  const setCollectionMode = useTonecraftStore((s) => s.setCollectionMode);
  const existingCollections = useTonecraftStore((s) => s.existingCollections);
  const selectedCollectionName = useTonecraftStore((s) => s.selectedCollectionName);
  const setSelectedCollectionName = useTonecraftStore((s) => s.setSelectedCollectionName);
  const newCollectionName = useTonecraftStore((s) => s.newCollectionName);
  const setNewCollectionName = useTonecraftStore((s) => s.setNewCollectionName);
  const setMode = useTonecraftStore((s) => s.setMode);
  const setStyleGuideTarget = useTonecraftStore((s) => s.setStyleGuideTarget);
  const setCreateDarkMode = useTonecraftStore((s) => s.setCreateDarkMode);

  // The actual reactivity fix: results are recomputed by React whenever
  // colorEntries or algorithm change, via useMemo inside useRamps — not a
  // function pulled out of the Zustand store and called imperatively.
  const results = useRamps(colorEntries, algorithm);
  const validRamps = results.filter((r) => r.ramp !== null).map((r) => r.ramp!);

  function handleGenerate() {
    if (validRamps.length === 0) return;
    setStatus("generating");
    setErrorMessage(null);
    parent.postMessage(
      {
        pluginMessage: {
          type: "generate",
          payload: {
            collectionName: activeCollectionName(),
            ramps: validRamps,
            mode,
            createDarkMode: mode !== "styles" && createDarkMode,
            styleGuideTarget,
          },
        },
      },
      "*",
    );
  }

  const isGenerating = status === "generating";
  const invalidCount = results.length - validRamps.length;

  return (
    <>
      <div className="generate-view-switcher" role="tablist" aria-label="Generate workspace">
        <button
          type="button"
          role="tab"
          aria-selected={view === "colors"}
          className={view === "colors" ? "active" : ""}
          onClick={() => setView("colors")}
        >
          Color list
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "wheel"}
          className={view === "wheel" ? "active" : ""}
          onClick={() => setView("wheel")}
        >
          Color wheel
        </button>
      </div>
      {view === "wheel" ? (
        <ColorWheelScreen />
      ) : (
    <div className="workspace">
      <div className="workspace-preview">
        <ColorEntryList results={results} />
        <AlgorithmSelector />
        <BigRampPreview results={results} />
      </div>

      <div className="workspace-sidebar">
        <CollectionSelector
          collectionMode={collectionMode}
          setCollectionMode={setCollectionMode}
          existingCollections={existingCollections}
          selectedCollectionName={selectedCollectionName}
          setSelectedCollectionName={setSelectedCollectionName}
          newCollectionName={newCollectionName}
          setNewCollectionName={setNewCollectionName}
          itemsLabel="primitives (Blue, Error, Success…)"
        />
        <GenerationOptions
          mode={mode}
          setMode={setMode}
          styleGuideTarget={styleGuideTarget}
          setStyleGuideTarget={setStyleGuideTarget}
          darkMode={{ checked: createDarkMode, setChecked: setCreateDarkMode }}
          dedicatedPageLabel="🎨 Color System page"
          cardLabel="Create a color palette card"
        />

        <div className="section">
          <div className="button-row">
            <button type="button" className="button button-secondary" onClick={resetForm} disabled={isGenerating}>
              Reset
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={handleGenerate}
              disabled={validRamps.length === 0 || isGenerating}
            >
              {isGenerating ? "Generating…" : `Generate${validRamps.length > 1 ? ` (${validRamps.length})` : ""}`}
            </button>
          </div>

          {invalidCount > 0 && !isGenerating && (
            <p className="field-hint field-hint-error">
              {invalidCount} color{invalidCount > 1 ? "s need" : " needs"} a name and a valid hex before generating.
            </p>
          )}

          {progress && (
            <>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
              </div>
              <p className="progress-label">{progress.label}</p>
            </>
          )}

          {status === "success" && (
            <div className="status-message success">Done — check the layers panel and the color card.</div>
          )}
          {status === "error" && errorMessage && <div className="status-message error">{errorMessage}</div>}
        </div>
      </div>
    </div>
      )}
    </>
  );
}
