import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { buildAfAuthoritativeIncrementalEvidence } from "./fragmentation-af-incremental-authoritative.js";
import { AF_BROWSER_CORPUS } from "./fragmentation-af-browser-corpus.js";
import { createWasmShapedLayoutHook } from "../layout/wasm-shaped-layout-hook.js";

const flowEntry = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../../../domdoc-wasm/pkg-node/domdoc_engine.js",
);

const evidenceDir = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../../evidence/gates/G4-feasibility",
);

describe("W2-G4-08 AF authoritative incremental layout", () => {
  it("records authoritative full vs oracle-split on stub layout", () => {
    const shaped = (payload: string) => {
      const input = JSON.parse(payload) as { text: string };
      return JSON.stringify([{ text: input.text, width_pt: 80, height_pt: 14 }]);
    };
    const evidence = buildAfAuthoritativeIncrementalEvidence(shaped);
    expect(evidence.corpusSize).toBe(AF_BROWSER_CORPUS.length);
    expect(evidence.gateStatus).toBe("not-run");
    expect(evidence.incrementalEnginePath).toBe("unavailable");
    expect(evidence.entries.every((e) => e.incrementalPath === "oracle-split")).toBe(true);
  });

  it.skipIf(!existsSync(flowEntry))("writes WASM authoritative incremental JSON artifact", async () => {
    const flow = await import(pathToFileURL(flowEntry).href);
    const hook = createWasmShapedLayoutHook(flow);
    const evidence = buildAfAuthoritativeIncrementalEvidence(hook.shapedLayoutJson, {
      incrementalEnginePath: hook.incrementalEnginePath,
      layoutIncrementalAtBreak: hook.layoutIncrementalAtBreak,
    });
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(
      join(evidenceDir, "af-incremental-authoritative.json"),
      `${JSON.stringify(evidence, null, 2)}\n`,
    );
    expect(evidence.entries.length).toBe(AF_BROWSER_CORPUS.length);
    expect(evidence.gateStatus).toBe("not-run");
  });
});
