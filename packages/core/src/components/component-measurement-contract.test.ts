import { describe, expect, it } from "vitest";
import { measureFragmentFromBounds } from "./component-measurement-contract.js";

describe("W2-G4-02 component measurement contract", () => {
  it("aligns break tokens with geometry bounds like WASM fragmentation types", () => {
    const outcome = measureFragmentFromBounds(
      {
        fragmentId: { value: "run-a" },
        sourceStart: 0,
        sourceEnd: 4,
        pageIndex: 0,
      },
      10,
      [{ runId: "run-a", xPt: 72, yPt: 700, widthPt: 120, heightPt: 14 }],
    );
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.measured.widthPt).toBe(120);
      expect(outcome.measured.sourceEnd).toBe(4);
    }
  });

  it("rejects inverted ranges and missing bounds consistently with G4 types", () => {
    expect(
      measureFragmentFromBounds(
        { fragmentId: { value: "run-a" }, sourceStart: 3, sourceEnd: 1, pageIndex: 0 },
        10,
        [{ runId: "run-a", xPt: 0, yPt: 0, widthPt: 10, heightPt: 10 }],
      ),
    ).toEqual({ ok: false, error: "inverted-range" });
    expect(
      measureFragmentFromBounds(
        { fragmentId: { value: "run-a" }, sourceStart: 0, sourceEnd: 2, pageIndex: 0 },
        10,
        [],
      ),
    ).toEqual({ ok: false, error: "missing-run-bounds" });
  });
});
