import { defineConfig } from "vitest/config";

// Deliberately separate from vite.config.ts, which sets root: "src/ui" for
// the plugin UI bundle — Vitest would otherwise inherit that root and never
// find tests/.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "node",
    // @material/material-color-utilities ships internal relative imports
    // without a ".js" extension. Node's native ESM resolver (and Vite's
    // default SSR resolver) reject that; esbuild's bundler-style resolution
    // does not. Routing it through the dep optimizer uses that more
    // lenient resolution instead of failing at import time.
    deps: {
      optimizer: {
        ssr: {
          enabled: true,
          include: ["@material/material-color-utilities"],
        },
        web: {
          enabled: true,
          include: ["@material/material-color-utilities"],
        },
      },
    },
  },
});
