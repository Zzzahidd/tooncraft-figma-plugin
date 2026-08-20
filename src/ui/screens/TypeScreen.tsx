import { useMemo } from "react";
import { useTonecraftStore } from "../state/store";
import { CollectionSelector } from "../components/CollectionSelector";
import { GenerationOptions } from "../components/GenerationOptions";
import { BigTypePreview } from "../components/BigTypePreview";
import { TypeStepList } from "../components/TypeStepList";
import { TypeFontList } from "../components/TypeFontList";
import { BreakpointSelector } from "../components/BreakpointSelector";
import { buildTypeScaleResult } from "../../type/typeScale";

export function TypeScreen() {
  const activeBreakpoints = useTonecraftStore((s) => s.activeBreakpoints);
  const breakpointConfigs = useTonecraftStore((s) => s.breakpointConfigs);
  const typeGridSize = useTonecraftStore((s) => s.typeGridSize);
  const setTypeGridSize = useTonecraftStore((s) => s.setTypeGridSize);
  const typeFonts = useTonecraftStore((s) => s.typeFonts);
  const typeSteps = useTonecraftStore((s) => s.typeSteps);

  const typeMode = useTonecraftStore((s) => s.typeMode);
  const setTypeMode = useTonecraftStore((s) => s.setTypeMode);
  const typeStyleGuideTarget = useTonecraftStore((s) => s.typeStyleGuideTarget);
  const setTypeStyleGuideTarget = useTonecraftStore((s) => s.setTypeStyleGuideTarget);

  const typeCollectionMode = useTonecraftStore((s) => s.typeCollectionMode);
  const setTypeCollectionMode = useTonecraftStore((s) => s.setTypeCollectionMode);
  const existingCollections = useTonecraftStore((s) => s.existingCollections);
  const typeSelectedCollectionName = useTonecraftStore((s) => s.typeSelectedCollectionName);
  const setTypeSelectedCollectionName = useTonecraftStore((s) => s.setTypeSelectedCollectionName);
  const typeNewCollectionName = useTonecraftStore((s) => s.typeNewCollectionName);
  const setTypeNewCollectionName = useTonecraftStore((s) => s.setTypeNewCollectionName);

  const status = useTonecraftStore((s) => s.status);
  const progress = useTonecraftStore((s) => s.progress);
  const errorMessage = useTonecraftStore((s) => s.errorMessage);
  const setStatus = useTonecraftStore((s) => s.setStatus);
  const setErrorMessage = useTonecraftStore((s) => s.setErrorMessage);
  const activeTypeCollectionName = useTonecraftStore((s) => s.activeTypeCollectionName);
  const activeTypeFontCollectionName = useTonecraftStore((s) => s.activeTypeFontCollectionName);
  const resetTypeForm = useTonecraftStore((s) => s.resetTypeForm);

  // Same reactivity fix as color/wheel: real useMemo over the actual
  // reactive fields (the whole editable step list, breakpoints, fonts),
  // not a function stashed in the store.
  const scale = useMemo(() => {
    try {
      return buildTypeScaleResult(
        activeBreakpoints,
        breakpointConfigs,
        typeGridSize,
        typeFonts,
        typeSteps,
      );
    } catch {
      return null;
    }
  }, [activeBreakpoints, breakpointConfigs, typeGridSize, typeFonts, typeSteps]);

  const isGenerating = status === "generating";
  const selectedStyleCount = typeSteps.reduce((count, step) => count + step.fontEntryIds.length, 0);
  const breakpointLabel = activeBreakpoints.map((breakpoint) => breakpoint[0].toUpperCase() + breakpoint.slice(1)).join(", ");
  const outputLabel = typeMode === "both" ? "variables and styles" : typeMode;

  function handleGenerate() {
    if (!scale) return;
    setStatus("generating");
    setErrorMessage(null);
    parent.postMessage(
      {
        pluginMessage: {
          type: "generate-type",
          payload: {
            collectionName: activeTypeCollectionName(),
            fontCollectionName: activeTypeFontCollectionName(),
            scale,
            mode: typeMode,
            styleGuideTarget: typeStyleGuideTarget,
          },
        },
      },
      "*",
    );
  }

  return (
    <div className="workspace">
      <div className="workspace-preview">
        <div className="type-workflow-intro">
          <p className="type-workflow-eyebrow">Type scale</p>
          <h2>Start with your fonts. Fine-tune only when needed.</h2>
          <p>Choose the weights you use, review the generated sizes, then create tokens and styles.</p>
        </div>

        <TypeFontList />
        <TypeStepList />

        <details className="type-disclosure">
          <summary>Advanced scale setup</summary>
          <div className="type-disclosure-content">
            <div className="field">
              <label htmlFor="type-grid-size">Round to grid (px)</label>
              <input
                id="type-grid-size"
                type="number"
                min={1}
                value={typeGridSize}
                onChange={(e) => setTypeGridSize(Math.max(1, Number(e.target.value) || 1))}
              />
              <p className="field-hint">Use 1 for no rounding.</p>
            </div>
            <BreakpointSelector />
          </div>
        </details>

        <details className="type-disclosure type-preview-disclosure">
          <summary>Preview generated scale</summary>
          <BigTypePreview scale={scale} />
        </details>
      </div>

      <div className="workspace-sidebar">
        <CollectionSelector
          collectionMode={typeCollectionMode}
          setCollectionMode={setTypeCollectionMode}
          existingCollections={existingCollections}
          selectedCollectionName={typeSelectedCollectionName}
          setSelectedCollectionName={setTypeSelectedCollectionName}
          newCollectionName={typeNewCollectionName}
          setNewCollectionName={setTypeNewCollectionName}
          itemsLabel="type scales"
          idPrefix="type"
        />
        <GenerationOptions
          mode={typeMode}
          setMode={setTypeMode}
          styleGuideTarget={typeStyleGuideTarget}
          setStyleGuideTarget={setTypeStyleGuideTarget}
          dedicatedPageLabel="🔤 Type System page"
          cardLabel="Create a type scale card"
        />

        <div className="section type-action-panel">
          <div className="type-generation-summary" aria-live="polite">
            <p>Ready to create</p>
            <span>{typeSteps.length} sizes · {selectedStyleCount} font styles · {breakpointLabel}</span>
            <span>{outputLabel}{typeStyleGuideTarget !== "none" ? " · style guide" : ""}</span>
          </div>
          <div className="button-row">
            <button
              type="button"
              className="button button-secondary"
              onClick={resetTypeForm}
              disabled={isGenerating}
            >
              Reset
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={handleGenerate}
              disabled={!scale || isGenerating}
            >
              {isGenerating ? "Generating…" : "Generate"}
            </button>
          </div>

          {progress && (
            <>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
              </div>
              <p className="progress-label">{progress.label}</p>
            </>
          )}

          {status === "success" && (
            <div className="status-message success">Done — check the layers panel and the type card.</div>
          )}
          {status === "error" && errorMessage && <div className="status-message error">{errorMessage}</div>}
        </div>
      </div>
    </div>
  );
}
