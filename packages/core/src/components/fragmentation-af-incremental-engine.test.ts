import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { evaluateAfEngineIncrementalVsFullEquivalence } from "./fragmentation-af-incremental-engine.js";
import { AF_BROWSER_CORPUS } from "./fragmentation-af-browser-corpus.js";
import { createWasmShapedLayoutHook } from "../layout/wasm-shaped-layout-hook.js";

const flowEntry = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../../../domdoc-wasm/pkg-node/domdoc_engine.js",
);

describe("W2-G4-09 AF engine incremental sketch", () => {
  it("records engine incremental verdicts on stub layout", () => {
    const shaped = (payload: string) => {
      const input = JSON.parse(payload) as { text: string };
      return JSON.stringify([{ text: input.text, width_pt: 80, height_pt: 14 }]);
    };
    const incremental = (_payload: string, _breakAt: number) =>
      JSON.stringify([{ text: "split", width_pt: 40, height_pt: 14 }]);
    const verdicts = evaluateAfEngineIncrementalVsFullEquivalence(shaped, incremental);
    expect(verdicts).toHaveLength(AF_BROWSER_CORPUS.length);
  });

  it.skipIf(!existsSync(flowEntry))(
    "uses WASM layout_flow_paragraph_incremental_json when exported",
    async () => {
      const flow = await import(pathToFileURL(flowEntry).href);
      const hook = createWasmShapedLayoutHook(flow);
      expect(hook.incrementalEnginePath).toBe("engine-sketch");
      expect(hook.layoutIncrementalAtBreak).toBeDefined();
      const verdicts = evaluateAfEngineIncrementalVsFullEquivalence(
        hook.shapedLayoutJson,
        hook.layoutIncrementalAtBreak!,
      );
      expect(verdicts.length).toBe(AF_BROWSER_CORPUS.length);
    },
  );
});
