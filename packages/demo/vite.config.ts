import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync } from "node:fs";

const demoRoot = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(demoRoot, "../..");
const wasmPkgRoot = path.join(webRoot, "../domdoc-wasm");
const useParleyEngine = process.env.DOMDOC_DEMO_PARLEY === "1";
/** Browser demo needs wasm-pack `web`/`bundler` ESM (`pkg`), not Node CJS (`pkg-node`). */
const enginePkgDir = path.join(
  wasmPkgRoot,
  useParleyEngine
    ? "pkg-parley"
    : existsSync(path.join(wasmPkgRoot, "pkg/domdoc_engine.js"))
      ? "pkg"
      : "pkg-node",
);
const pdfiumVendor = path.join(webRoot, "vendor/domdoc-pdfium-wasm");

export default defineConfig({
  root: demoRoot,
  plugins: [tailwindcss(), nodePolyfills({ include: ["crypto"] })],
  resolve: {
    alias: {
      "@domdoc/demo-engine": path.join(enginePkgDir, "domdoc_engine.js"),
      "@domdoc/shell-ui": path.join(demoRoot, "../shell-ui/src/index.ts"),
      "@domdoc/shell-ui/styles.css": path.join(demoRoot, "../shell-ui/src/styles.css"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      allow: [demoRoot, wasmPkgRoot, webRoot, pdfiumVendor],
    },
  },
  optimizeDeps: {
    exclude: ["domdoc-wasm", "domdoc_pdfium"],
  },
});
