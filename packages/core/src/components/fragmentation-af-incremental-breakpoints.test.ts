import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { AF_BROWSER_CORPUS } from "./fragmentation-af-browser-corpus.js";
import { buildAfEditBreakpointEvidence } from "./fragmentation-af-incremental-breakpoints.js";
import { createWasmShapedLayoutHook } from "../layout/wasm-shaped-layout-hook.js";

const flowEntry = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../../../domdoc-wasm/pkg-node/domdoc_engine.js",
);

const evidenceDir = join(
  import.meta.dirname,
  "../../../../evidence/gates/G4-feasibility",
);

describe("W2-G4-12 AF incremental edit breakpoints", () => {
  it("records stub breakpoint drift for deterministic single-line layout", () => {
    const shaped = (payload: string) => {
      const input = JSON.parse(payload) as { text: string };
      return JSON.stringify([{ text: input.text, width_pt: 80, height_pt: 14 }]);
    };
    const incremental = () => JSON.stringify([{ text: "split", width_pt: 40, height_pt: 14 }]);
    const legal = () => [0];
    const evidence = buildAfEditBreakpointEvidence(shaped, incremental, legal);
    expect(evidence.gateStatus).toBe("not-run");
    expect(evidence.entries.length).toBeGreaterThan(0);
  });

  it.skipIf(!existsSync(flowEntry))(
    "writes WASM edit-breakpoint evidence when pkg-node built",
    async () => {
      const flow = await import(pathToFileURL(flowEntry).href);
      const hook = createWasmShapedLayoutHook(flow);
      expect(hook.layoutIncrementalAtBreak).toBeDefined();
      expect(hook.legalBreaksJson).toBeDefined();
      const evidence = buildAfEditBreakpointEvidence(
        hook.shapedLayoutJson,
        hook.layoutIncrementalAtBreak!,
        hook.legalBreaksJson!,
      );
      expect(evidence.corpusSize).toBe(AF_BROWSER_CORPUS.length);
      expect(evidence.allLegalBreakpointsEquivalent).toBe(true);
      expect(evidence.allArbitraryBreakpointsEquivalent).toBe(true);
      mkdirSync(evidenceDir, { recursive: true });
      writeFileSync(
        join(evidenceDir, "af-incremental-edit-breakpoints.json"),
        `${JSON.stringify(evidence, null, 2)}\n`,
      );
    },
  );
});
