import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { AF_BROWSER_CORPUS } from "./fragmentation-af-browser-corpus.js";
import { buildAfPostEditIncrementalEvidence } from "./fragmentation-af-post-edit-incremental.js";
import { createWasmShapedLayoutHook } from "../layout/wasm-shaped-layout-hook.js";

const flowEntry = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../../../domdoc-wasm/pkg-node/domdoc_engine.js",
);

const evidenceDir = join(
  import.meta.dirname,
  "../../../../evidence/gates/G4-feasibility",
);

describe("W2-G4-14 AF post-edit safe suffix incremental", () => {
  it("records stub drift for deterministic single-line layout", () => {
    const shaped = (payload: string) => {
      const input = JSON.parse(payload) as { text: string };
      return JSON.stringify([{ text: input.text, width_pt: 80, height_pt: 14 }]);
    };
    const incremental = () => JSON.stringify([{ text: "edited", width_pt: 40, height_pt: 14 }]);
    const evidence = buildAfPostEditIncrementalEvidence(shaped, incremental);
    expect(evidence.gateStatus).toBe("not-run");
    expect(evidence.entries.length).toBe(AF_BROWSER_CORPUS.length);
  });

  it.skipIf(!existsSync(flowEntry))(
    "writes WASM post-edit evidence when pkg-node built",
    async () => {
      const flow = await import(pathToFileURL(flowEntry).href);
      const hook = createWasmShapedLayoutHook(flow);
      expect(hook.layoutIncrementalAtBreak).toBeDefined();
      const layoutIncrementalWithPreEdit = (
        paragraphPayload: string,
        breakAfterCharIndex: number,
        preEditText: string,
      ) => {
        const paragraph = JSON.parse(paragraphPayload) as Record<string, unknown>;
        const incrementalPayload = JSON.stringify({
          paragraph,
          breakAfterCharIndex,
          preEditText,
        });
        return String(flow.layout_flow_paragraph_incremental_json!(incrementalPayload));
      };
      const evidence = buildAfPostEditIncrementalEvidence(
        hook.shapedLayoutJson,
        layoutIncrementalWithPreEdit,
      );
      expect(evidence.corpusSize).toBe(AF_BROWSER_CORPUS.length);
      expect(evidence.allPostEditSuffixBreakpointsEquivalent).toBe(true);
      mkdirSync(evidenceDir, { recursive: true });
      writeFileSync(
        join(evidenceDir, "af-incremental-post-edit-suffix.json"),
        `${JSON.stringify(evidence, null, 2)}\n`,
      );
    },
  );
});
