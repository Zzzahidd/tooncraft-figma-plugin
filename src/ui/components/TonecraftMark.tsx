interface TonecraftMarkProps {
  size?: number;
}

/** Inline version of icons/icon.svg, scaled down for use in the plugin's
 * own header. Keeping it as a component (rather than an <img src>) avoids
 * bundling a second asset — the UI build already inlines everything into
 * one HTML file. */
export function TonecraftMark({ size = 24 }: TonecraftMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 680 680" role="img" aria-label="Tonecraft">
      <rect x="0" y="0" width="680" height="680" rx="140" fill="#141417" />
      <rect x="55" y="435" width="190" height="190" rx="34" fill="#EEF2FF" />
      <rect x="150" y="340" width="190" height="190" rx="34" fill="#C7D2FE" />
      <rect x="245" y="245" width="190" height="190" rx="34" fill="#818CF8" />
      <rect x="340" y="150" width="190" height="190" rx="34" fill="#4F46E5" />
      <rect x="435" y="55" width="190" height="190" rx="34" fill="#1E1B4B" />
    </svg>
  );
}
