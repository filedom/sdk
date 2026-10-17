import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { buildAfIncrementalGateGradeEvidence } from "./fragmentation-af-incremental-gate-grade.js";
import { AF_BROWSER_CORPUS } from "./fragmentation-af-browser-corpus.js";

const flowEntry = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../../../domdoc-wasm/pkg-node/domdoc_engine.js",
);

const evidenceDir = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../../evidence/gates/G4-feasibility",
);

describe("W2-G4-07 AF incremental gate-grade oracle", () => {
  it("records gate-grade evidence for deterministic stub layout", () => {
    const shaped = (payload: string) => {
      const input = JSON.parse(payload) as { text: string };
      return JSON.stringify([{ text: input.text, width_pt: 80, height_pt: 14 }]);
    };
    const evidence = buildAfIncrementalGateGradeEvidence(shaped);
    expect(evidence.corpusSize).toBe(AF_BROWSER_CORPUS.length);
    expect(evidence.gateStatus).toBe("not-run");
    expect(evidence.entries.every((e) => e.fullLayoutIdempotent)).toBe(true);
  });

  it.skipIf(!existsSync(flowEntry))("writes WASM flow gate-grade JSON artifact", async () => {
    const flow = await import(pathToFileURL(flowEntry).href);
    const shaped = (payload: string) => String(flow.layout_flow_paragraph_shaped_json(payload));
    const evidence = buildAfIncrementalGateGradeEvidence(shaped, {
      legalBreaksJson: (payload) => String(flow.layout_flow_paragraph_legal_breaks_json(payload)),
      incrementalLayoutJson: (payload) => String(flow.layout_flow_paragraph_incremental_json(payload)),
    });
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(
      join(evidenceDir, "af-incremental-gate-grade.json"),
      `${JSON.stringify(evidence, null, 2)}\n`,
    );
    expect(evidence.entries.length).toBe(AF_BROWSER_CORPUS.length);
    expect(evidence.gateStatus).toBe("not-run");
  });
});
