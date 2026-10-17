/** Web mirror of W2-G4-01 break tokens (layout authority stays in WASM). */

export interface FragmentId {
  value: string;
}

export interface BreakToken {
  fragmentId: FragmentId;
  sourceStart: number;
  sourceEnd: number;
  pageIndex: number;
}

export type FragmentValidationError =
  | "empty-range"
  | "inverted-range"
  | "beyond-content"
  | "zero-progress";

export function validateBreakToken(
  token: BreakToken,
  contentLength: number,
): FragmentValidationError | null {
  if (token.sourceEnd <= token.sourceStart) {
    return token.sourceStart === token.sourceEnd ? "empty-range" : "inverted-range";
  }
  if (token.sourceEnd > contentLength) return "beyond-content";
  return null;
}
