import { useEffect } from "react";
import { useTonecraftStore } from "./state/store";
import { TonecraftMark } from "./components/TonecraftMark";
import { NavTabs } from "./components/NavTabs";
import { GenerateScreen } from "./screens/GenerateScreen";
import { TypeScreen } from "./screens/TypeScreen";
import type { FigmaPluginMessageEvent, MainToUiMessage } from "../shared/types";

export function App() {
  const screen = useTonecraftStore((s) => s.screen);
  const setStatus = useTonecraftStore((s) => s.setStatus);
  const setProgress = useTonecraftStore((s) => s.setProgress);
  const setErrorMessage = useTonecraftStore((s) => s.setErrorMessage);
  const setExistingCollections = useTonecraftStore((s) => s.setExistingCollections);

  // Lives at the shell level, not inside GenerateScreen — the message
  // listener has to stay mounted regardless of the visible area so a
  // generation result is never lost while the user is choosing colors.
  useEffect(() => {
    parent.postMessage({ pluginMessage: { type: "list-collections" } }, "*");

    function onMessage(event: MessageEvent<FigmaPluginMessageEvent<MainToUiMessage>>) {
      const message = event.data.pluginMessage;
      if (!message) return;

      switch (message.type) {
        case "progress":
          setProgress(message.payload);
          break;
        case "generate-complete":
          setStatus("success");
          setProgress(null);
          // Refresh the collection list so a just-created collection shows
          // up as "existing" next time without reopening the plugin.
          parent.postMessage({ pluginMessage: { type: "list-collections" } }, "*");
          break;
        case "generate-error":
          setStatus("error");
          setProgress(null);
          setErrorMessage(message.payload.message);
          break;
        case "collections-list":
          setExistingCollections(message.payload.collections);
          break;
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [setProgress, setStatus, setErrorMessage, setExistingCollections]);

  return (
    <div className="app">
      <div className="header">
        <div className="header-title">
          <div className="header-title-left">
            <TonecraftMark size={22} />
            <h1>Tonecraft</h1>
          </div>
        </div>
        <p>Generate production-grade color primitives from your brand colors.</p>
      </div>

      <NavTabs />

      {screen === "generate" ? <GenerateScreen /> : <TypeScreen />}
    </div>
  );
}
