import { describe, expect, it } from "vitest";
import { collectP01P05VendorProofEvidence } from "./pdfium-p01-p05-runner.js";

describe("G1-PDF-07 P01–P05 vendor proof hooks", () => {
  it("keeps native proofs not-run without C24 writer exports", async () => {
    const evidence = await collectP01P05VendorProofEvidence();
    expect(evidence.writerExportsReady).toBe(false);
    expect(evidence.status === "stub-not-run" || evidence.status === "probe-adapter-load-only").toBe(
      true,
    );
    if (evidence.status === "probe-adapter-load-only") {
      expect(evidence.moduleLoaded).toBe(true);
    } else {
      expect(evidence.moduleLoaded).toBe(false);
    }
    expect(evidence.fixtures).toHaveLength(5);
    expect(evidence.fixtures.every((f) => f.nativeProof === "not-run")).toBe(true);
    expect(evidence.fixtures.every((f) => f.hookReady === false)).toBe(true);
  });
});
