import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildAfAuthoritativeGateProofRunnerEvidence,
  resolveAuthoritativeGatePathFromCoordinatorAccept,
} from "./fragmentation-af-authoritative-gate-proof-runner.js";
import { createWasmShapedLayoutHook } from "../layout/wasm-shaped-layout-hook.js";

const flowEntry = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../../../domdoc-wasm/pkg-node/domdoc_engine.js",
);

const evidenceDir = join(import.meta.dirname, "../../../../evidence/gates/G4-feasibility");

describe("W2-G4-18 AF authoritative gate proof runner", () => {
  it("W2-G4-19 keeps not-run when coordinator accept missing bundled evidence", () => {
    const path = resolveAuthoritativeGatePathFromCoordinatorAccept(
      {
        coordinatorAccept: true,
        coordinatorId: "coord",
        browserDemoPostEditEquivalent: false,
        nodeWasmPostEditEquivalent: true,
        e2eAfCorpusDeclared: true,
      },
      true,
    );
    expect(path).toBe("not-run");
  });

  it("keeps authoritative gate path not-run on stub layout", () => {
    const shaped = (payload: string) => {
      const input = JSON.parse(payload) as { text: string };
      return JSON.stringify([{ text: input.text, width_pt: 80, height_pt: 14 }]);
    };
    const evidence = buildAfAuthoritativeGateProofRunnerEvidence(shaped, {});
    expect(evidence.card).toBe("W2-G4-18");
    expect(evidence.authoritativeGatePath).toBe("not-run");
    expect(evidence.browserPathDeclared).toBe(true);
    expect(evidence.nodeWasmExercised).toBe(false);
  });

  it.skipIf(!existsSync(flowEntry))("writes authoritative gate proof runner JSON from node WASM", async () => {
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
    const evidence = buildAfAuthoritativeGateProofRunnerEvidence(hook.shapedLayoutJson, {
      layoutIncrementalWithPreEdit,
      incrementalOptions: {
        incrementalEnginePath: hook.incrementalEnginePath,
        layoutIncrementalAtBreak: layoutIncrementalWithPreEdit,
      },
    });
    expect(evidence.nodeWasmExercised).toBe(true);
    expect(evidence.nodeWasmPostEdit?.scaledPostEditAllEquivalent).toBe(true);
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(
      join(evidenceDir, "af-authoritative-gate-proof-runner.json"),
      `${JSON.stringify(evidence, null, 2)}\n`,
    );
  });
});
