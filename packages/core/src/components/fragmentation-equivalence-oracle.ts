import type { BreakToken } from "./fragmentation-types.js";
import type { MeasuredFragment } from "./component-measurement-contract.js";
import { assertStableFragmentMeasurements } from "./component-measurement-layout-stability.js";

/** W2-G4-04: Taleweaver-style bounded measurement convergence oracle (stub). */
export interface FragmentationLayoutPass {
  readonly passIndex: number;
  readonly fragments: readonly MeasuredFragment[];
  readonly breakTokens: readonly BreakToken[];
}

export type FragmentationEquivalenceVerdict =
  | { equivalent: true; convergedAtPass: number }
  | { equivalent: false; reason: "max-passes" | "dimension-drift"; detail: string; passes: number };

export function runFragmentationConvergenceOracle(
  measurePass: (passIndex: number) => FragmentationLayoutPass,
  maxPasses: number,
): FragmentationEquivalenceVerdict {
  if (maxPasses < 2) {
    return {
      equivalent: false,
      reason: "max-passes",
      detail: "need at least two passes",
      passes: maxPasses,
    };
  }
  let previous: FragmentationLayoutPass | null = null;
  for (let pass = 0; pass < maxPasses; pass += 1) {
    const current = measurePass(pass);
    if (previous) {
      const stable = assertStableFragmentMeasurements(
        current.fragments,
        previous.fragments,
      );
      if (stable.ok && stable.stable) {
        return { equivalent: true, convergedAtPass: pass };
      }
      if (!stable.ok) {
        return {
          equivalent: false,
          reason: "dimension-drift",
          detail: stable.detail,
          passes: pass + 1,
        };
      }
    }
    previous = current;
  }
  return {
    equivalent: false,
    reason: "max-passes",
    detail: "layout did not converge within bound",
    passes: maxPasses,
  };
}

/** Incremental vs full layout equivalence hook (oracle stub — proofs not-run). */
export function fragmentsEquivalent(
  incremental: readonly MeasuredFragment[],
  full: readonly MeasuredFragment[],
): boolean {
  const outcome = assertStableFragmentMeasurements(incremental, full);
  return outcome.ok && outcome.stable;
}
