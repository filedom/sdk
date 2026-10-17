import { describe, expect, it } from "vitest";
import { collectP01P05VendorProofEvidence } from "./pdfium-p01-p05-runner.js";

describe("G1-PDF-07 P01–P05 vendor proof hooks", () => {
  it("records stub or native proofs depending on C24 writer availability", async () => {
    const evidence = await collectP01P05VendorProofEvidence();
    const core = evidence.fixtures.filter((f) =>
      ["P01", "P02", "P03", "P04", "P05"].includes(f.fixtureId),
    );
    expect(core).toHaveLength(5);
    expect(evidence.fixtures.some((f) => f.fixtureId === "P11")).toBe(true);
    expect(evidence.fixtures.some((f) => f.fixtureId === "P12")).toBe(true);
    if (!evidence.writerExportsReady) {
      expect(
        evidence.status === "stub-not-run"
          || evidence.status === "probe-adapter-load-only"
          || evidence.status === "classification-blocked-upstream-gn",
      ).toBe(true);
      expect(core.every((f) => f.nativeProof === "blocked" || f.nativeProof === "not-run")).toBe(
        true,
      );
      if (evidence.status === "classification-blocked-upstream-gn") {
        expect(core.every((f) => f.nativeProof === "blocked")).toBe(true);
        expect(core.every((f) => f.blockedReason === "pdfium-wasm-target-unsupported-in-upstream-gn")).toBe(
          true,
        );
      }
    } else {
      expect(evidence.status).toBe("native-proofs-run");
      expect(evidence.moduleLoaded).toBe(true);
    }
  });
});
