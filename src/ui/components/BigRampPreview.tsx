import type { RampResult } from "../hooks/useRamps";

interface BigRampPreviewProps {
  results: RampResult[];
}

export function BigRampPreview({ results }: BigRampPreviewProps) {
  const validResults = results.filter((r) => r.ramp !== null);

  if (validResults.length === 0) {
    return (
      <div className="preview-empty">
        <p>Enter a name and a valid hex color to preview a scale.</p>
      </div>
    );
  }

  return (
    <div className="big-preview">
      {validResults.map((result) => {
        const ramp = result.ramp!;
        return (
          <div className="big-ramp-item" key={result.entryId}>
            <p className="big-ramp-name">
              {ramp.name}
              <span className="big-ramp-algorithm">
                {ramp.algorithm === "material-hct" ? "Material Design 3" : "Tint / shade (OKLCH)"}
              </span>
            </p>
            <div className="big-ramp-strip">
              {ramp.swatches.map((swatch) => {
                // Use whichever of the two theme text tones has more
                // contrast against this specific swatch — a fixed text
                // color would go unreadable at one end of the scale.
                const textColor = swatch.contrast.onWhite >= swatch.contrast.onBlack ? "#f5f5f5" : "#2c2c2c";
                return (
                  <div
                    key={swatch.step}
                    className={`big-ramp-swatch${swatch.isSourceStep ? " is-source" : ""}`}
                    style={{ background: swatch.hex, color: textColor }}
                    title={`${swatch.step} — ${swatch.hex}`}
                  >
                    <span className="big-ramp-step">{swatch.step}</span>
                    <span className="big-ramp-hex">{swatch.hex.toUpperCase()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
