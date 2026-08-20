import * as esbuild from "esbuild";

// The main thread runs in Figma's sandboxed plugin runtime, not a browser
// and not Node — no DOM, no dynamic import(), no bundler-specific globals.
// esbuild's default IIFE output with a conservative target is the right
// shape for that, which is why this is a separate build from the UI's
// Vite/browser bundle.
await esbuild.build({
  entryPoints: ["src/main/code.ts"],
  bundle: true,
  outfile: "dist/code.js",
  format: "iife",
  target: "es2019",
  platform: "neutral",
  logLevel: "info",
});
