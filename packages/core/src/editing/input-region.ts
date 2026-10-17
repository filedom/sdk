import type { HitTarget } from "./geometry-map.js";

export interface InputRegionState {
  pageIndex: number;
  runId: string;
  /** Grapheme-safe caret offset within run text (web-owned; engine provides bounds only). */
  caretOffset: number;
}

export function activateRegionFromHit(
  hit: HitTarget,
  caretOffset = 0,
): InputRegionState {
  return {
    pageIndex: hit.pageIndex,
    runId: hit.runId,
    caretOffset: Math.max(0, caretOffset),
  };
}

export function sameInputRegion(a: InputRegionState, b: InputRegionState): boolean {
  return (
    a.pageIndex === b.pageIndex &&
    a.runId === b.runId &&
    a.caretOffset === b.caretOffset
  );
}

/** I10 subset: retain focus identity when geometry updates but run id persists. */
export function rebindRegionAfterGeometry(
  previous: InputRegionState | null,
  targets: readonly HitTarget[],
): InputRegionState | null {
  if (!previous) return null;
  const still = targets.find(
    (t) => t.pageIndex === previous.pageIndex && t.runId === previous.runId,
  );
  if (!still) return null;
  return { ...previous };
}
