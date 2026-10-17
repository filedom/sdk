import { describe, expect, it } from "vitest";
import { collectP01P05VendorProofEvidence } from "./pdfium-p01-p05-runner.js";

describe("G1-PDF-07 P01–P05 vendor proof hooks", () => {
  it("records stub-not-run when PDFium WASM is not vendored", async () => {
    const evidence = await collectP01P05VendorProofEvidence();
    expect(evidence.status).toBe("stub-not-run");
    expect(evidence.moduleLoaded).toBe(false);
    expect(evidence.fixtures).toHaveLength(5);
    expect(evidence.fixtures.every((f) => f.nativeProof === "not-run")).toBe(true);
  });
});
