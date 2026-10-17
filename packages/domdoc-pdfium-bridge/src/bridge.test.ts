import { describe, expect, it } from "vitest";
import { DOMDOC_PDFIUM_BRIDGE_ROLE, describePdfiumLibProbeLayoutNode } from "./index.js";

describe("@domdoc/pdfium-bridge display stub", () => {
  it("declares display-only bridge role", () => {
    expect(DOMDOC_PDFIUM_BRIDGE_ROLE).toBe("display-probe-bridge");
    expect(describePdfiumLibProbeLayoutNode().probeDir).toContain("pdfium-lib-probe");
  });
});
