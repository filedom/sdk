import { describe, expect, it } from "vitest";
import { loadPdfiumLibProbeViaWorker } from "./pdfium-lib-probe-render-worker-client.js";
import { describePdfiumLibProbeLayoutNode } from "./pdfium-lib-probe-render-node.js";

describe("G1 pdfium-lib probe render worker (optional)", () => {
  it("loads probe adapter in worker when vendor bytes exist", async () => {
    const layout = describePdfiumLibProbeLayoutNode();
    if (!layout.adapterEntry) {
      expect(layout.wasmFiles.length).toBe(0);
      return;
    }
    const workerScript = new URL("./pdfium-lib-probe-render-worker.ts", import.meta.url);
    const status = await loadPdfiumLibProbeViaWorker(workerScript, {
      execArgv: ["--import", "tsx/esm"],
    });
    expect(status.renderOnly).toBe(true);
    expect(status.moduleLoaded).toBe(true);
  });
});
