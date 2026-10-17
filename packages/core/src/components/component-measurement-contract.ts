import {
  validateBreakToken,
  type BreakToken,
  type FragmentId,
  type FragmentValidationError,
} from "./fragmentation-types.js";

/** Geometry bounds for a laid-out fragment (web measurement contract, W2-G4-02). */
export interface FragmentRunBounds {
  runId: string;
  xPt: number;
  yPt: number;
  widthPt: number;
  heightPt: number;
}

export interface MeasuredFragment {
  fragmentId: FragmentId;
  sourceStart: number;
  sourceEnd: number;
  pageIndex: number;
  widthPt: number;
  heightPt: number;
}

export type MeasureFragmentOutcome =
  | { ok: true; measured: MeasuredFragment }
  | { ok: false; error: FragmentValidationError | "missing-run-bounds" };

/**
 * Derive component fragment measurements from WASM-aligned break tokens and
 * compositor geometry (read-only; no layout authority in web).
 */
export function measureFragmentFromBounds(
  token: BreakToken,
  contentLength: number,
  bounds: readonly FragmentRunBounds[],
): MeasureFragmentOutcome {
  const validation = validateBreakToken(token, contentLength);
  if (validation) return { ok: false, error: validation };
  const run = bounds.find((b) => b.runId === token.fragmentId.value);
  if (!run) return { ok: false, error: "missing-run-bounds" };
  if (run.widthPt <= 0 || run.heightPt <= 0) {
    return { ok: false, error: "zero-progress" };
  }
  return {
    ok: true,
    measured: {
      fragmentId: token.fragmentId,
      sourceStart: token.sourceStart,
      sourceEnd: token.sourceEnd,
      pageIndex: token.pageIndex,
      widthPt: run.widthPt,
      heightPt: run.heightPt,
    },
  };
}
