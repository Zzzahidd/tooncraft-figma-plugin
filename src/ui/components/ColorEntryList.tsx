import { Plus, X } from "lucide-react";
import { useTonecraftStore, COLOR_PRESETS } from "../state/store";
import type { RampResult } from "../hooks/useRamps";

interface ColorEntryListProps {
  results: RampResult[];
}

export function ColorEntryList({ results }: ColorEntryListProps) {
  const colorEntries = useTonecraftStore((s) => s.colorEntries);
  const updateColorEntry = useTonecraftStore((s) => s.updateColorEntry);
  const removeColorEntry = useTonecraftStore((s) => s.removeColorEntry);
  const addColorEntry = useTonecraftStore((s) => s.addColorEntry);

  const usedNames = new Set(colorEntries.map((e) => e.name.trim().toLowerCase()));
  const availablePresets = COLOR_PRESETS.filter((p) => !usedNames.has(p.name.toLowerCase()));

  return (
    <div className="section">
      <p className="section-label">Colors</p>

      <div className="color-entry-grid">
        {colorEntries.map((entry, index) => {
          const result = results[index];
          const pickerValue = /^#[0-9a-fA-F]{6}$/.test(entry.hex) ? entry.hex : "#71717a";
          const showInvalidHint = entry.hex.length > 0 && result && !result.isValid;

          return (
            <div className="color-entry" key={entry.id}>
              <div className="color-row">
                <div className="color-swatch-input" style={{ background: pickerValue }}>
                  <input
                    type="color"
                    value={pickerValue}
                    onChange={(e) => updateColorEntry(entry.id, { hex: e.target.value })}
                    aria-label={`Pick color for ${entry.name || "this entry"}`}
                  />
                </div>
                <input
                  type="text"
                  className="entry-name"
                  value={entry.name}
                  onChange={(e) => updateColorEntry(entry.id, { name: e.target.value })}
                  placeholder="Name, e.g. Primary"
                  spellCheck={false}
                  aria-label="Color group name"
                />
                <input
                  type="text"
                  className="entry-hex"
                  value={entry.hex}
                  onChange={(e) => updateColorEntry(entry.id, { hex: e.target.value })}
                  placeholder="#4F46E5"
                  spellCheck={false}
                  aria-label="Hex value"
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => removeColorEntry(entry.id)}
                  disabled={colorEntries.length === 1}
                  aria-label={`Remove ${entry.name || "color"}`}
                  title="Remove"
                >
                  <X size={14} />
                </button>
              </div>
              {showInvalidHint && <p className="field-hint field-hint-error">Enter a 6-digit hex, e.g. #4F46E5.</p>}
            </div>
          );
        })}
      </div>

      <button type="button" className="add-color-button" onClick={() => addColorEntry()}>
        <Plus size={14} />
        Add color
      </button>

      {availablePresets.length > 0 && (
        <div className="preset-row">
          {availablePresets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className="preset-chip"
              onClick={() => addColorEntry(preset)}
              style={{ ["--chip-color" as string]: preset.hex }}
            >
              <span className="preset-dot" />
              {preset.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
