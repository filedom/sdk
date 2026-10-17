import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const flowEntry = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../../../../domdoc-wasm/pkg-node/domdoc_engine.js",
);
const parleyEntry = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../../../../domdoc-wasm/pkg-node-parley/domdoc_engine.js",
);

const PINNED_INPUT = {
  paragraph_id: "pinned-sans",
  text: "The quick brown fox jumps over the lazy dog repeatedly",
  max_width_pt: 72,
  font_size_pt: 12,
};

/** G2-LAYOUT-06: parley-shaping pkg tags pinned font stack; shaped JSON ≠ flow-fallback pkg. */
describe.skipIf(!existsSync(parleyEntry) || !existsSync(flowEntry))(
  "G2-LAYOUT-06 shaped vs flow on pinned fonts",
  () => {
    it("parley-eval shaped output differs from flow-fallback shaped JSON", async () => {
      const flow = await import(pathToFileURL(flowEntry).href);
      const parley = await import(pathToFileURL(parleyEntry).href);
      const payload = JSON.stringify(PINNED_INPUT);
      const flowShaped = flow.layout_flow_paragraph_shaped_json(payload);
      const parleyShaped = parley.layout_flow_paragraph_shaped_json(payload);
      expect(String(flow.layout_shaping_backend_id())).toBe("flow-fallback");
      expect(String(parley.layout_shaping_backend_id())).toBe("parley-eval");
      expect(parleyShaped).not.toBe(flowShaped);
      const lines = JSON.parse(String(parleyShaped)) as Array<{
        shaping_backend?: string;
        primary_font_family?: string;
      }>;
      expect(lines.some((l) => l.shaping_backend === "parley-eval")).toBe(true);
      expect(lines[0]?.primary_font_family).toContain("Domdoc Sans Fallback");
    });
  },
);
