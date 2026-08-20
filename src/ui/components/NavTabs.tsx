import { useTonecraftStore } from "../state/store";
import type { Screen } from "../state/store";

const SCREENS: { value: Screen; label: string }[] = [
  { value: "generate", label: "Generate" },
  { value: "type", label: "Type Scale" },
];

export function NavTabs() {
  const screen = useTonecraftStore((s) => s.screen);
  const setScreen = useTonecraftStore((s) => s.setScreen);

  return (
    <div className="main-nav">
      <div className="segmented" role="tablist" aria-label="Screen">
        {SCREENS.map((s) => (
          <button
            key={s.value}
            type="button"
            role="tab"
            aria-selected={screen === s.value}
            className={screen === s.value ? "active" : ""}
            onClick={() => setScreen(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
