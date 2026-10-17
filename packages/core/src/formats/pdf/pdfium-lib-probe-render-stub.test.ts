import { describe, expect, it } from "vitest";
import { describePdfiumLibProbeLayoutNode, tryLoadPdfiumLibProbeRenderNode } from "./pdfium-lib-probe-render-node.js";
import { tryLoadPdfiumLibProbeRender } from "./pdfium-lib-probe-render-stub.js";

describe("pdfium-lib probe render stub", () => {
  it("describes empty probe layout without throwing", () => {
    const layout = describePdfiumLibProbeLayoutNode("/tmp/domdoc-nonexistent-probe-dir");
    expect(layout.wasmFiles).toEqual([]);
  });

  it("reports module not loaded when probe vendor absent (node)", async () => {
    const status = await tryLoadPdfiumLibProbeRenderNode();
    expect(status.renderOnly).toBe(true);
    expect(status.nonProduction).toBe(true);
    if (!status.probePresent) {
      expect(status.moduleLoaded).toBe(false);
    }
  });

  it("browser stub stays honest when vendor not served", async () => {
    const status = await tryLoadPdfiumLibProbeRender();
    expect(status.moduleLoaded).toBe(false);
    expect(status.probePresent).toBe(false);
  });
});
