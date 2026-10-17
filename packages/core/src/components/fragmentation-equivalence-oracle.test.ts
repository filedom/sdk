import { describe, expect, it } from "vitest";
import { measureFragmentFromBounds } from "./component-measurement-contract.js";
import {
  fragmentsEquivalent,
  runFragmentationConvergenceOracle,
} from "./fragmentation-equivalence-oracle.js";

function sampleFragment(widthPt: number) {
  const outcome = measureFragmentFromBounds(
    { fragmentId: { value: "f0" }, sourceStart: 0, sourceEnd: 4, pageIndex: 0 },
    10,
    [{ runId: "f0", xPt: 0, yPt: 0, widthPt, heightPt: 24 }],
  );
  if (!outcome.ok) throw new Error(String(outcome.error));
  return outcome.measured;
}

describe("W2-G4-04 fragmentation equivalence oracle stub", () => {
  it("converges when consecutive passes match", () => {
    const sample = [sampleFragment(100)];
    const verdict = runFragmentationConvergenceOracle(
      () => ({
        passIndex: 0,
        fragments: sample,
        breakTokens: [],
      }),
      4,
    );
    expect(verdict.equivalent).toBe(true);
    if (verdict.equivalent) expect(verdict.convergedAtPass).toBe(1);
  });

  it("reports drift when sizes change between passes", () => {
    const verdict = runFragmentationConvergenceOracle(
      (pass) => ({
        passIndex: pass,
        fragments: [sampleFragment(pass === 0 ? 100 : 120)],
        breakTokens: [],
      }),
      3,
    );
    expect(verdict.equivalent).toBe(false);
  });

  it("compares incremental vs full layouts", () => {
    const a = sampleFragment(50);
    const b = sampleFragment(50);
    expect(fragmentsEquivalent([a], [b])).toBe(true);
  });
});
