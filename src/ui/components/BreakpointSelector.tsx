import { useTonecraftStore } from "../state/store";
import { BREAKPOINT_LABELS, BREAKPOINTS, SCALE_RATIOS } from "../../shared/types";
import type { Breakpoint } from "../../shared/types";

export function BreakpointSelector() {
  const activeBreakpoints = useTonecraftStore((s) => s.activeBreakpoints);
  const toggleBreakpoint = useTonecraftStore((s) => s.toggleBreakpoint);
  const breakpointConfigs = useTonecraftStore((s) => s.breakpointConfigs);
  const setBreakpointConfig = useTonecraftStore((s) => s.setBreakpointConfig);

  return (
    <div className="section">
      <p className="section-label">Breakpoints</p>
      <p className="field-hint">Start with Desktop. Add Tablet or Mobile only when heading values need to change.</p>

      <div className="breakpoint-toggle-row">
        {BREAKPOINTS.map((bp) => (
          <label key={bp} className="breakpoint-toggle">
            <input
              type="checkbox"
              checked={activeBreakpoints.includes(bp)}
              onChange={() => toggleBreakpoint(bp)}
              disabled={activeBreakpoints.length === 1 && activeBreakpoints.includes(bp)}
            />
            {BREAKPOINT_LABELS[bp]}
          </label>
        ))}
      </div>

      {activeBreakpoints.map((bp: Breakpoint) => {
        const config = breakpointConfigs[bp] ?? { baseSize: 16, ratio: 1.25 };
        return (
          <div className="breakpoint-config" key={bp}>
            <p className="subsection-label">{BREAKPOINT_LABELS[bp]}</p>
            <div className="type-field-row">
              <div className="field">
                <label htmlFor={`bp-base-${bp}`}>Base size (px)</label>
                <input
                  id={`bp-base-${bp}`}
                  type="number"
                  min={1}
                  value={config.baseSize}
                  onChange={(e) => setBreakpointConfig(bp, { baseSize: Number(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div className="harmony-scheme-list">
              {SCALE_RATIOS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  className={`harmony-scheme-option${config.ratio === r.value ? " active" : ""}`}
                  onClick={() => setBreakpointConfig(bp, { ratio: r.value })}
                >
                  {r.label} ({r.value})
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
