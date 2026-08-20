import { converter, formatHex, wcagContrast, round } from "culori";
import type { Swatch } from "../shared/types";

const toRgb = converter("rgb");
const toHsl = converter("hsl");
const toOklch = converter("oklch");
const roundTo3 = round(3);

/** Builds a fully-populated Swatch from a hex string. Shared by both
 * generation algorithms so the downstream UI, exporters, and style-guide
 * page all consume one consistent shape. */
export function buildSwatch(step: string, hex: string, isSourceStep: boolean): Swatch {
  const normalizedHex = formatHex(hex) ?? hex;
  const rgb = toRgb(normalizedHex);
  const hsl = toHsl(normalizedHex);
  const oklch = toOklch(normalizedHex);

  if (!rgb || !hsl || !oklch) {
    throw new Error(`Could not parse color "${hex}".`);
  }

  return {
    step,
    hex: normalizedHex,
    rgb: {
      r: Math.round(rgb.r * 255),
      g: Math.round(rgb.g * 255),
      b: Math.round(rgb.b * 255),
    },
    hsl: {
      h: Math.round(hsl.h ?? 0),
      s: Math.round((hsl.s ?? 0) * 100),
      l: Math.round((hsl.l ?? 0) * 100),
    },
    oklch: {
      l: roundTo3(oklch.l ?? 0),
      c: roundTo3(oklch.c ?? 0),
      h: Math.round(oklch.h ?? 0),
    },
    contrast: {
      onWhite: roundTo3(wcagContrast(normalizedHex, "#ffffff")),
      onBlack: roundTo3(wcagContrast(normalizedHex, "#000000")),
    },
    isSourceStep,
  };
}
