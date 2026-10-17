import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const parleyEntry = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../../../../domdoc-wasm/pkg-node-parley/domdoc_engine.js",
);

/** G2-LAYOUT-05: optional parley-shaping WASM pkg (built via domdoc-wasm/scripts/wasm-pack-parley.mjs). */
describe.skipIf(!existsSync(parleyEntry))("G2-LAYOUT-05 parley wasm npm path", () => {
  it("reports parley-eval shaping backend in node wasm pkg", async () => {
    const wasm = await import(pathToFileURL(parleyEntry).href);
    expect(String(wasm.layout_shaping_backend_id())).toBe("parley-eval");
  });
});
