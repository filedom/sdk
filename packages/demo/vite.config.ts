import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";

const demoRoot = path.dirname(fileURLToPath(import.meta.url));

const wasmPkgRoot = path.join(demoRoot, "../../../domdoc-wasm");

export default defineConfig({
  root: demoRoot,
  server: {
    port: 5173,
    strictPort: true,
    fs: { allow: [demoRoot, wasmPkgRoot] },
  },
  optimizeDeps: {
    exclude: ["domdoc-wasm"],
  },
});
