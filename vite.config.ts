import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Figma loads the plugin UI as a single raw HTML string (the manifest's
// "ui" field, injected into the main thread as the __html__ global) — it
// cannot fetch separate JS/CSS files at runtime. viteSingleFile inlines
// everything into one dist/ui.html so this works without a server.
export default defineConfig({
  root: "src/ui",
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: "../../dist",
    emptyOutDir: false,
    target: "es2020",
    rollupOptions: {
      input: "src/ui/index.html",
      output: {
        entryFileNames: "ui.js",
      },
    },
  },
});
