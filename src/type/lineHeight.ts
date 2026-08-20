/**
 * Default unitless line-height for a given font size, on the principle
 * that larger text needs tighter line-height and smaller text needs
 * looser line-height — confirmed against multiple current typography
 * sources rather than assumed: large headings ~1.1-1.3, body text
 * ~1.5-1.7, small text ~1.6-1.8.
 *
 * This is a starting point, not a mandate — every step's line-height is
 * individually editable after generation.
 */
const ANCHORS: [px: number, lineHeight: number][] = [
  [12, 1.7],
  [16, 1.5],
  [24, 1.35],
  [32, 1.25],
  [48, 1.15],
  [61, 1.1],
];

export function defaultLineHeightForSize(px: number): number {
  if (px <= ANCHORS[0][0]) return ANCHORS[0][1];
  const last = ANCHORS[ANCHORS.length - 1];
  if (px >= last[0]) return last[1];

  for (let i = 1; i < ANCHORS.length; i++) {
    const [x1, y1] = ANCHORS[i];
    if (px <= x1) {
      const [x0, y0] = ANCHORS[i - 1];
      return Math.round((y0 + ((y1 - y0) * (px - x0)) / (x1 - x0)) * 100) / 100;
    }
  }
  return 1.5;
}
