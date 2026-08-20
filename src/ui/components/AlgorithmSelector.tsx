import { useTonecraftStore } from "../state/store";
import type { Algorithm } from "../../shared/types";

const OPTIONS: { value: Algorithm; label: string }[] = [
  { value: "tailwind-oklch", label: "Tint / shade (OKLCH)" },
  { value: "material-hct", label: "Material Design 3" },
];

export function AlgorithmSelector() {
  const algorithm = useTonecraftStore((s) => s.algorithm);
  const setAlgorithm = useTonecraftStore((s) => s.setAlgorithm);

  return (
    <div className="section">
      <p className="section-label">Algorithm</p>
      <div className="segmented" role="tablist" aria-label="Color scale algorithm">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={algorithm === option.value}
            className={algorithm === option.value ? "active" : ""}
            onClick={() => setAlgorithm(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
