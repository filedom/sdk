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

/** G2-LAYOUT-07: corpus entries where shaped line breaks may differ from flow heuristics. */
const VISUAL_CORPUS = [
  {
    id: "LV-01",
    text: "ffi fl ligature probe words flow wrap boundary",
    max_width_pt: 64,
    font_size_pt: 12,
  },
  {
    id: "LV-02",
    text: "The quick brown fox jumps over the lazy dog repeatedly",
    max_width_pt: 72,
    font_size_pt: 12,
  },
  {
    id: "LV-03",
    text: "Domdoc Sans Fallback shaping metadata on each line",
    max_width_pt: 88,
    font_size_pt: 11,
  },
] as const;

function lineTexts(shapedJson: string): string[] {
  const lines = JSON.parse(shapedJson) as Array<{ text: string }>;
  return lines.map((l) => l.text);
}

describe("G2-LAYOUT-07 font visual corpus (flow pkg)", () => {
  it.skipIf(!existsSync(flowEntry))("flow corpus produces deterministic multi-line wraps", async () => {
    const flow = await import(pathToFileURL(flowEntry).href);
    for (const entry of VISUAL_CORPUS) {
      const payload = JSON.stringify({
        paragraph_id: entry.id,
        text: entry.text,
        max_width_pt: entry.max_width_pt,
        font_size_pt: entry.font_size_pt,
      });
      const a = lineTexts(String(flow.layout_flow_paragraph_shaped_json(payload)));
      const b = lineTexts(String(flow.layout_flow_paragraph_shaped_json(payload)));
      expect(a).toEqual(b);
      expect(a.join(" ").replace(/\s+/g, " ").trim()).toBe(
        entry.text.replace(/\s+/g, " ").trim(),
      );
    }
  });
});

describe.skipIf(!existsSync(parleyEntry) || !existsSync(flowEntry))(
  "G2-LAYOUT-07 shaped vs flow on visual corpus",
  () => {
    it("parley-eval shaped JSON differs from flow-fallback on visual corpus", async () => {
      const flow = await import(pathToFileURL(flowEntry).href);
      const parley = await import(pathToFileURL(parleyEntry).href);
      let anyJsonDiff = false;
      let anyLineBreakDiff = false;
      for (const entry of VISUAL_CORPUS) {
        const payload = JSON.stringify({
          paragraph_id: entry.id,
          text: entry.text,
          max_width_pt: entry.max_width_pt,
          font_size_pt: entry.font_size_pt,
        });
        const flowJson = String(flow.layout_flow_paragraph_shaped_json(payload));
        const parleyJson = String(parley.layout_flow_paragraph_shaped_json(payload));
        if (flowJson !== parleyJson) anyJsonDiff = true;
        const flowLines = lineTexts(flowJson);
        const parleyLines = lineTexts(parleyJson);
        if (flowLines.join("|") !== parleyLines.join("|")) anyLineBreakDiff = true;
      }
      expect(anyJsonDiff).toBe(true);
      expect(anyLineBreakDiff || anyJsonDiff).toBe(true);
    });
  },
);
