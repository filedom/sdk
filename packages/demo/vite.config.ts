import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createReadStream, existsSync } from "node:fs";

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
const hasProductionPdfium = existsSync(path.join(pdfiumVendor, "domdoc_pdfium.js"));
const pdfiumGlueBasename =
  process.env.DOMDOC_DEMO_PDFIUM_STUB === "1" &&
  existsSync(path.join(pdfiumVendor, "domdoc_pdfium_contract_stub.js"))
    ? "domdoc_pdfium_contract_stub"
    : hasProductionPdfium
      ? "domdoc_pdfium"
      : "domdoc_pdfium_contract_stub";

export default defineConfig({
  root: demoRoot,
  plugins: [
    tailwindcss(),
    nodePolyfills({ include: ["crypto"] }),
    {
      name: "domdoc-pdfium-static",
      configureServer(server) {
        server.middlewares.use("/pdfium", (req, res, next) => {
          const rel = (req.url ?? "/").split("?")[0]!.replace(/^\//, "");
          if (!rel || rel.includes("..")) {
            next();
            return;
          }
          const file = path.join(pdfiumVendor, rel);
          if (!file.startsWith(pdfiumVendor) || !existsSync(file)) {
            next();
            return;
          }
          const type = rel.endsWith(".wasm")
            ? "application/wasm"
            : rel.endsWith(".js")
              ? "application/javascript"
              : "application/octet-stream";
          res.setHeader("Content-Type", type);
          createReadStream(file).pipe(res);
        });
      },
    },
  ],
  define: {
    __DEMO_PDFIUM_GLUE_BASENAME__: JSON.stringify(pdfiumGlueBasename),
    "import.meta.env.VITE_DEMO_EAGER": JSON.stringify(process.env.DOMDOC_DEMO_EAGER ?? "0"),
  },
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
    exclude: ["domdoc-wasm"],
  },
});
