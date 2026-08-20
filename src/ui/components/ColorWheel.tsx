import { generateWheelRingStops } from "../../color/wheelRing";
import type { HarmonyColor } from "../../color/harmony";

const WHEEL_SIZE = 200;
const RING_STEPS = 48;
const MARKER_INSET = 14;

// Static — the ring itself never depends on props, so this is computed once
// at module load rather than per render.
const WHEEL_GRADIENT = (() => {
  const stops = generateWheelRingStops(RING_STEPS);
  const stopStrings = stops.map((hex, i) => `${hex} ${(i / RING_STEPS) * 360}deg`);
  stopStrings.push(`${stops[0]} 360deg`);
  return `conic-gradient(${stopStrings.join(", ")})`;
})();

interface ColorWheelProps {
  colors: HarmonyColor[];
  selectedRole: string | null;
  onSelect: (color: HarmonyColor) => void;
}

export function ColorWheel({ colors, selectedRole, onSelect }: ColorWheelProps) {
  const radius = WHEEL_SIZE / 2;
  const markerRadius = radius - MARKER_INSET;

  return (
    <div className="color-wheel" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE, background: WHEEL_GRADIENT }}>
      {colors.map((color) => {
        const angleRad = (color.hue * Math.PI) / 180;
        const x = radius + markerRadius * Math.sin(angleRad);
        const y = radius - markerRadius * Math.cos(angleRad);
        return (
          <button
            key={color.role}
            type="button"
            className={`wheel-marker${color.isBase ? " is-base" : ""}${
              selectedRole === color.role ? " is-selected" : ""
            }`}
            style={{ left: x, top: y, background: color.hex }}
            onClick={() => onSelect(color)}
            title={`${color.role} — ${color.hex}`}
            aria-label={`${color.role}, ${color.hex}`}
          />
        );
      })}
    </div>
  );
}
