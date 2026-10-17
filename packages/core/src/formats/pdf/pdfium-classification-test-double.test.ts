import { describe, expect, it } from "vitest";
import {
  createDomdocPdfiumClassificationTestDouble,
  runP01P05ClassificationWithTestDouble,
} from "./pdfium-classification-test-double.js";

describe("DomdocPdfiumApi classification test double (G1 CI)", () => {
  it("simulates P01–P05 classification with blocked native proofs", () => {
    const records = runP01P05ClassificationWithTestDouble();
    expect(records).toHaveLength(5);
    expect(records.map((r) => r.fixtureId)).toEqual(["P01", "P02", "P03", "P04", "P05"]);
    expect(records.every((r) => r.nativeProof === "blocked")).toBe(true);
    expect(
      records.every((r) => r.blockedReason === "pdfium-wasm-target-unsupported-in-upstream-gn"),
    ).toBe(true);
  });

  it("exposes minimal DomdocPdfiumApi surface for hook wiring", () => {
    const api = createDomdocPdfiumClassificationTestDouble();
    const doc = api.createDocument();
    expect(api.save(doc).byteLength).toBeGreaterThan(0);
    api.close(doc);
  });
});
