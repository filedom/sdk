import { describe, expect, it } from "vitest";
import { measureFragmentFromBounds } from "./component-measurement-contract.js";
import { assertStableFragmentMeasurements } from "./component-measurement-layout-stability.js";

describe("W2-G4-03 layout-stable fragmentation measurement", () => {
  it("accepts identical consecutive measurements", () => {
    const token = {
      fragmentId: { value: "run-a" },
      sourceStart: 0,
      sourceEnd: 4,
      pageIndex: 0,
    };
    const bounds = [{ runId: "run-a", xPt: 72, yPt: 700, widthPt: 120, heightPt: 14 }];
    const first = measureFragmentFromBounds(token, 10, bounds);
    const second = measureFragmentFromBounds(token, 10, bounds);
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(assertStableFragmentMeasurements([second.measured], [first.measured])).toEqual({
        ok: true,
        stable: true,
      });
    }
  });

  it("rejects width drift between layout passes", () => {
    const sample = {
      fragmentId: { value: "run-a" },
      sourceStart: 0,
      sourceEnd: 4,
      pageIndex: 0,
      widthPt: 120,
      heightPt: 14,
    };
    const drifted = { ...sample, widthPt: 121 };
    expect(assertStableFragmentMeasurements([drifted], [sample])).toEqual({
      ok: false,
      reason: "dimension-drift",
      detail: "size drift on run-a",
    });
  });
});
