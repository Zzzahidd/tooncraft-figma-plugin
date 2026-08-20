import { useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
import { useTonecraftStore } from "../state/store";
import { ColorWheel } from "../components/ColorWheel";
import { computeHarmony, HARMONY_SCHEMES } from "../../color/harmony";
import type { HarmonyColor } from "../../color/harmony";

const HEX_PATTERN = /^#?[0-9a-fA-F]{6}$/;

export function ColorWheelScreen() {
  const wheelBaseHex = useTonecraftStore((s) => s.wheelBaseHex);
  const setWheelBaseHex = useTonecraftStore((s) => s.setWheelBaseHex);
  const wheelScheme = useTonecraftStore((s) => s.wheelScheme);
  const setWheelScheme = useTonecraftStore((s) => s.setWheelScheme);
  const addColorEntry = useTonecraftStore((s) => s.addColorEntry);

  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [justAddedRole, setJustAddedRole] = useState<string | null>(null);

  const normalized = wheelBaseHex.startsWith("#") ? wheelBaseHex : `#${wheelBaseHex}`;
  const isValidHex = HEX_PATTERN.test(normalized);
  const pickerValue = isValidHex ? normalized : "#71717a";

  // Recomputed via useMemo over the actual reactive inputs — same fix as
  // the Generate screen's live preview, not a stashed store function.
  const colors: HarmonyColor[] = useMemo(() => {
    if (!isValidHex) return [];
    try {
      return computeHarmony(normalized, wheelScheme);
    } catch {
      return [];
    }
  }, [normalized, isValidHex, wheelScheme]);

  const schemeInfo = HARMONY_SCHEMES.find((s) => s.value === wheelScheme)!;

  function handleAdd(color: HarmonyColor) {
    addColorEntry({ name: color.role, hex: color.hex });
    setJustAddedRole(color.role);
    setTimeout(() => setJustAddedRole((current) => (current === color.role ? null : current)), 1600);
  }

  return (
    <div className="workspace">
      {/* Brand color pairs with the wheel here — it's the one input that
          directly, continuously drives what the wheel shows, so it sits
          next to the visual rather than in the settings rail. */}
      <div className="workspace-preview">
        <div className="section">
          <p className="section-label">Brand color</p>
          <div className="field">
            <div className="color-row">
              <div className="color-swatch-input" style={{ background: pickerValue }}>
                <input
                  type="color"
                  value={pickerValue}
                  onChange={(e) => setWheelBaseHex(e.target.value)}
                  aria-label="Pick brand color"
                />
              </div>
              <input
                type="text"
                value={wheelBaseHex}
                onChange={(e) => setWheelBaseHex(e.target.value)}
                placeholder="#4F46E5"
                spellCheck={false}
                aria-label="Brand color hex"
              />
            </div>
            {!isValidHex && wheelBaseHex.length > 0 && (
              <p className="field-hint field-hint-error">Enter a 6-digit hex, e.g. #4F46E5.</p>
            )}
          </div>
        </div>

        <div className="wheel-center-area">
          {isValidHex && colors.length > 0 ? (
            wheelScheme === "monochromatic" ? (
              <div className="mono-strip-wrap mono-strip-wrap-big">
                <div className="ramp-strip">
                  {colors.map((color) => (
                    <div
                      key={color.role}
                      className={`ramp-swatch${color.isBase ? " is-source" : ""}`}
                      style={{ background: color.hex }}
                      title={`${color.role} — ${color.hex}`}
                    />
                  ))}
                </div>
                <p className="field-hint">
                  Same hue throughout — shown as a strip, not the wheel, since every step would land on the
                  same point.
                </p>
              </div>
            ) : (
              <div className="wheel-wrap">
                <ColorWheel colors={colors} selectedRole={selectedRole} onSelect={(c) => setSelectedRole(c.role)} />
              </div>
            )
          ) : (
            <div className="preview-empty">
              <p>Enter a valid brand color to see it on the wheel.</p>
            </div>
          )}
        </div>
      </div>

      {/* Scheme choice + the resulting list/actions stay in the rail —
          you pick a lens, read the outcomes, and act on them here. */}
      <div className="workspace-sidebar">
        <div className="section">
          <p className="section-label">Harmony</p>
          <div className="harmony-scheme-list">
            {HARMONY_SCHEMES.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`harmony-scheme-option${wheelScheme === s.value ? " active" : ""}`}
                onClick={() => setWheelScheme(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="field-hint">{schemeInfo.description}</p>
        </div>

        {isValidHex && colors.length > 0 && (
          <div className="section">
            <p className="section-label">Results</p>
            <div className="harmony-results">
              {colors.map((color) => (
                <div
                  key={color.role}
                  className={`harmony-result-row${selectedRole === color.role ? " is-selected" : ""}`}
                  onClick={() => setSelectedRole(color.role)}
                >
                  <span className="harmony-result-swatch" style={{ background: color.hex }} />
                  <span className="harmony-result-role">
                    {color.role}
                    {color.isBase && <span className="harmony-result-tag">yours</span>}
                  </span>
                  <span className="harmony-result-hex">{color.hex.toUpperCase()}</span>
                  {!color.isBase && (
                    <button
                      type="button"
                      className="icon-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdd(color);
                      }}
                      title="Add to Generate"
                      aria-label={`Add ${color.role} to the Generate screen`}
                    >
                      {justAddedRole === color.role ? <Check size={14} /> : <Plus size={14} />}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {justAddedRole && <p className="field-hint">Added {justAddedRole} to your color list.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
