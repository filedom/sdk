/**
 * Maps extracted text indices to native PDF objects (blueprint §3.1 step 1).
 * W1: structural placeholder until PDFium text-object association is wired.
 */

export interface PdfSourceTextRun {
  pageIndex: number;
  objectId: string;
  text: string;
  /** Inclusive start in page text extraction order. */
  charStart: number;
  charEnd: number;
}

export interface PdfSourceMap {
  runs: PdfSourceTextRun[];
  extractionRevision: number;
}

export function buildStubSourceMap(
  pageIndex: number,
  plainText: string,
  extractionRevision: number,
): PdfSourceMap {
  if (plainText.length === 0) {
    return { runs: [], extractionRevision };
  }
  return {
    extractionRevision,
    runs: [
      {
        pageIndex,
        objectId: `stub-obj-${pageIndex}-0`,
        text: plainText,
        charStart: 0,
        charEnd: plainText.length,
      },
    ],
  };
}

export function resolveRunAtOffset(
  map: PdfSourceMap,
  offset: number,
): PdfSourceTextRun | undefined {
  return map.runs.find(
    (run) => offset >= run.charStart && offset < run.charEnd,
  );
}
