import type { MeasuredFragment } from "./component-measurement-contract.js";

export type LayoutStabilityOutcome =
  | { ok: true; stable: true }
  | { ok: false; reason: "dimension-drift" | "insufficient-samples"; detail: string };

/**
 * W2-G4-03: browser-side fragmentation measurements must stay stable across
 * consecutive layout passes when geometry is unchanged (read-only contract).
 */
export function assertStableFragmentMeasurements(
  samples: readonly MeasuredFragment[],
  previous: readonly MeasuredFragment[],
): LayoutStabilityOutcome {
  if (samples.length === 0 || previous.length === 0) {
    return { ok: false, reason: "insufficient-samples", detail: "need paired layout passes" };
  }
  if (samples.length !== previous.length) {
    return {
      ok: false,
      reason: "dimension-drift",
      detail: `fragment count ${previous.length} -> ${samples.length}`,
    };
  }
  for (let i = 0; i < samples.length; i += 1) {
    const a = samples[i]!;
    const b = previous[i]!;
    if (a.fragmentId.value !== b.fragmentId.value) {
      return {
        ok: false,
        reason: "dimension-drift",
        detail: `fragment id mismatch at ${i}`,
      };
    }
    if (a.widthPt !== b.widthPt || a.heightPt !== b.heightPt) {
      return {
        ok: false,
        reason: "dimension-drift",
        detail: `size drift on ${a.fragmentId.value}`,
      };
    }
  }
  return { ok: true, stable: true };
}
