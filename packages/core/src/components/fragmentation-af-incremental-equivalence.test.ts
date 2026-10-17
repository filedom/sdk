import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { evaluateAfIncrementalVsFullEquivalence } from "./fragmentation-af-incremental-equivalence.js";
import { AF_BROWSER_CORPUS } from "./fragmentation-af-browser-corpus.js";

const flowEntry = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../../../../domdoc-wasm/pkg-node/domdoc_engine.js",
);

describe("W2-G4-06 AF incremental vs full equivalence", () => {
  it("records incremental vs full verdicts for deterministic stub layout", () => {
    const shaped = (payload: string) => {
      const input = JSON.parse(payload) as { text: string };
      return JSON.stringify([{ text: input.text, width_pt: 80, height_pt: 14 }]);
    };
    const verdicts = evaluateAfIncrementalVsFullEquivalence(shaped);
    expect(verdicts).toHaveLength(AF_BROWSER_CORPUS.length);
    expect(verdicts.every((v) => typeof v.equivalent === "boolean")).toBe(true);
    expect(verdicts.every((v) => v.detail.length > 0)).toBe(true);
  });

  it.skipIf(!existsSync(flowEntry))(
    "records WASM flow layout incremental vs full verdicts (proof not-run for gate)",
    async () => {
      const flow = await import(pathToFileURL(flowEntry).href);
      const shaped = (payload: string) =>
        String(flow.layout_flow_paragraph_shaped_json(payload));
      const verdicts = evaluateAfIncrementalVsFullEquivalence(shaped);
      expect(verdicts.length).toBe(AF_BROWSER_CORPUS.length);
      for (const v of verdicts) {
        expect(v.detail.length).toBeGreaterThan(0);
      }
    },
  );
});
