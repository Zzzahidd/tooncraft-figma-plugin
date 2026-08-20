import type { GenerationMode, StyleGuideTarget } from "../../shared/types";

const MODE_OPTIONS: { value: GenerationMode; label: string }[] = [
  { value: "variables", label: "Variables" },
  { value: "styles", label: "Styles" },
  { value: "both", label: "Both" },
];

interface GenerationOptionsProps {
  mode: GenerationMode;
  setMode: (mode: GenerationMode) => void;
  styleGuideTarget: StyleGuideTarget;
  setStyleGuideTarget: (target: StyleGuideTarget) => void;
  /** Dark mode only makes sense for color (a token has a light/dark
   * value); a font-size variable has no such concept, so the type-scale
   * screen omits this row entirely rather than showing a checkbox that
   * does nothing meaningful. */
  darkMode?: { checked: boolean; setChecked: (value: boolean) => void };
  /** "🎨 Color System page" vs "🔤 Type System page" — same mechanism,
   * different destination page per domain. */
  dedicatedPageLabel: string;
  cardLabel: string;
}

export function GenerationOptions({
  mode,
  setMode,
  styleGuideTarget,
  setStyleGuideTarget,
  darkMode,
  dedicatedPageLabel,
  cardLabel,
}: GenerationOptionsProps) {
  const cardEnabled = styleGuideTarget !== "none";
  const pageTargetOptions: { value: Exclude<StyleGuideTarget, "none">; label: string }[] = [
    { value: "current", label: "This page" },
    { value: "dedicated", label: dedicatedPageLabel },
  ];

  return (
    <div className="section">
      <p className="section-label">Output</p>
      <div className="field">
        <div className="segmented" role="tablist" aria-label="Generation mode">
          {MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={mode === option.value}
              className={mode === option.value ? "active" : ""}
              onClick={() => setMode(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {darkMode && (
        <div className="checkbox-row">
          <input
            id="dark-mode"
            type="checkbox"
            checked={darkMode.checked}
            onChange={(e) => darkMode.setChecked(e.target.checked)}
            disabled={mode === "styles"}
          />
          <label htmlFor="dark-mode">Add Dark mode{mode === "styles" ? " (requires Variables)" : ""}</label>
        </div>
      )}

      <div className="checkbox-row">
        <input
          id="style-guide"
          type="checkbox"
          checked={cardEnabled}
          onChange={(e) => setStyleGuideTarget(e.target.checked ? "dedicated" : "none")}
        />
        <label htmlFor="style-guide">{cardLabel}</label>
      </div>

      {cardEnabled && (
        <div className="field indent">
          <div className="segmented" role="tablist" aria-label="Card page target">
            {pageTargetOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={styleGuideTarget === option.value}
                className={styleGuideTarget === option.value ? "active" : ""}
                onClick={() => setStyleGuideTarget(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="field-hint">
            {styleGuideTarget === "dedicated"
              ? `Creates a separate guide frame on the shared ${dedicatedPageLabel}.`
              : "Creates a separate guide frame on the page you have open."}
          </p>
        </div>
      )}
    </div>
  );
}
