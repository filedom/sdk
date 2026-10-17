/** F165 — legacy binary DOC import (positive path declared; parser integration not-run). */

export interface LegacyDocImportLossItem {
  code: string;
  detail: string;
}

export interface LegacyDocImportResult {
  supported: boolean;
  /** Original bytes retained for provenance (never re-labeled as DOCX). */
  originalBytes: Uint8Array;
  /** Populated when a declared subset conversion succeeds. */
  convertedDocxBytes?: Uint8Array;
  lossReport: readonly LegacyDocImportLossItem[];
  parserId: "rwml-eval-not-run" | "none";
}

/** Bounded positive-import stub: preserves source and reports loss until rwml/parser is pinned. */
export function importLegacyDocStub(bytes: Uint8Array): LegacyDocImportResult {
  return {
    supported: false,
    originalBytes: bytes,
    lossReport: [
      {
        code: "parser-not-integrated",
        detail:
          "F165: auditable legacy DOC parser (e.g. rwml) not pinned; plain extraction is not full support.",
      },
    ],
    parserId: "rwml-eval-not-run",
  };
}
