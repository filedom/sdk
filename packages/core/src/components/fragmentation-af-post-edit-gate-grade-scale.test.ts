import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { AF_BROWSER_CORPUS } from "./fragmentation-af-browser-corpus.js";
import { buildAfPostEditGateGradeScaleEvidence } from "./fragmentation-af-post-edit-gate-grade-scale.js";
import { createWasmShapedLayoutHook } from "../layout/wasm-shaped-layout-hook.js";

const flowEntry = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../../../domdoc-wasm/pkg-node/domdoc_engine.js",
);

const evidenceDir = join(
  import.meta.dirname,
  "../../../../evidence/gates/G4-feasibility",
);

describe("W2-G4-16 AF post-edit gate-grade scale", () => {
  it("records scaled breakpoints on stub layout", () => {
    const shaped = (payload: string) => {
      const input = JSON.parse(payload) as { text: string };
      return JSON.stringify([{ text: input.text, width_pt: 80, height_pt: 14 }]);
    };
    const incremental = () => JSON.stringify([{ text: "edited", width_pt: 40, height_pt: 14 }]);
    const evidence = buildAfPostEditGateGradeScaleEvidence(shaped, incremental);
    expect(evidence.gateStatus).toBe("not-run");
    expect(evidence.breakpointsPerEntry).toBe(3);
    expect(evidence.entries.length).toBe(AF_BROWSER_CORPUS.length);
  });

  it.skipIf(!existsSync(flowEntry))(
    "writes WASM scaled post-edit evidence when pkg-node built",
    async () => {
      const flow = await import(pathToFileURL(flowEntry).href);
      const hook = createWasmShapedLayoutHook(flow);
      const layoutIncrementalWithPreEdit = (
        paragraphPayload: string,
        breakAfterCharIndex: number,
        preEditText: string,
      ) => {
        const paragraph = JSON.parse(paragraphPayload) as Record<string, unknown>;
        return String(
          flow.layout_flow_paragraph_incremental_json!(
            JSON.stringify({ paragraph, breakAfterCharIndex, preEditText }),
          ),
        );
      };
      const evidence = buildAfPostEditGateGradeScaleEvidence(
        hook.shapedLayoutJson,
        layoutIncrementalWithPreEdit,
        { breakpointsPerEntry: 3 },
      );
      expect(evidence.scaledPostEditAllEquivalent).toBe(true);
      mkdirSync(evidenceDir, { recursive: true });
      writeFileSync(
        join(evidenceDir, "af-incremental-post-edit-gate-grade-scale.json"),
        `${JSON.stringify(evidence, null, 2)}\n`,
      );
    },
  );
});
