import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";

const demoRoot = path.dirname(fileURLToPath(import.meta.url));

const wasmPkgRoot = path.join(demoRoot, "../../../domdoc-wasm");
const useParleyEngine = process.env.DOMDOC_DEMO_PARLEY === "1";
const enginePkgDir = path.join(wasmPkgRoot, useParleyEngine ? "pkg-parley" : "pkg");

export default defineConfig({
  root: demoRoot,
  resolve: {
    alias: {
      "@domdoc/demo-engine": path.join(enginePkgDir, "domdoc_engine.js"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: { allow: [demoRoot, wasmPkgRoot] },
  },
  optimizeDeps: {
    exclude: ["domdoc-wasm"],
  },
});
