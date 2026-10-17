import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { buildAfBrowserPostEditGateGradeEvidence } from "./fragmentation-af-browser-post-edit-gate-grade.js";
import { createWasmShapedLayoutHook } from "../layout/wasm-shaped-layout-hook.js";

const flowEntry = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../../../domdoc-wasm/pkg-node/domdoc_engine.js",
);

const evidenceDir = join(import.meta.dirname, "../../../../evidence/gates/G4-feasibility");

describe("W2-G4-17 AF browser post-edit gate-grade path", () => {
  it("records authoritative gate path not-run on stub layout", () => {
    const shaped = (payload: string) => {
      const input = JSON.parse(payload) as { text: string };
      return JSON.stringify([{ text: input.text, width_pt: 80, height_pt: 14 }]);
    };
    const incremental = () => JSON.stringify([{ text: "edited", width_pt: 40, height_pt: 14 }]);
    const evidence = buildAfBrowserPostEditGateGradeEvidence(shaped, incremental, {
      incrementalEnginePath: "unavailable",
      proofPath: "browser-demo-wasm",
    });
    expect(evidence.card).toBe("W2-G4-17");
    expect(evidence.authoritativeGatePath).toBe("not-run");
    expect(evidence.gateStatus).toBe("not-run");
  });

  it.skipIf(!existsSync(flowEntry))("writes WASM browser post-edit gate-grade JSON", async () => {
    const flow = await import(pathToFileURL(flowEntry).href);
    const hook = createWasmShapedLayoutHook(flow);
    const layoutIncrementalWithPreEdit = (
      paragraphPayload: string,
      breakAfterCharIndex: number,
      preEditText: string,
    ) =>
      String(
        flow.layout_flow_paragraph_incremental_json!(
          JSON.stringify({ paragraph: JSON.parse(paragraphPayload), breakAfterCharIndex, preEditText }),
        ),
      );
    const evidence = buildAfBrowserPostEditGateGradeEvidence(
      hook.shapedLayoutJson,
      layoutIncrementalWithPreEdit,
      {
        incrementalEnginePath: hook.incrementalEnginePath,
        proofPath: "node-wasm-pkg",
        breakpointsPerEntry: 3,
      },
    );
    expect(evidence.scaledPostEditAllEquivalent).toBe(true);
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(
      join(evidenceDir, "af-browser-post-edit-gate-grade.json"),
      `${JSON.stringify(evidence, null, 2)}\n`,
    );
  });
});
