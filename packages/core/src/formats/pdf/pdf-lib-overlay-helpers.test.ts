import { describe, expect, it } from "vitest";
import { createPdfLibOverlayPageBytes } from "./pdf-lib-overlay-helpers.js";

describe("pdf-lib overlay helpers (C12, not G1)", () => {
  it("creates overlay-only PDF bytes without claiming gate pass", async () => {
    const result = await createPdfLibOverlayPageBytes({ overlayText: "domdoc overlay" });
    expect(result.gatePass).toBe(false);
    expect(result.overlayOnly).toBe(true);
    expect(result.pageCount).toBe(1);
    expect(result.byteLength).toBeGreaterThan(100);
    expect(result.bytes[0]).toBe(0x25);
  });
});
