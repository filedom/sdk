/** Recorded when Chromium PDFium gn rejects `target_os=wasm` and C24 writer bytes are absent. */
export const PDFIUM_WASM_TARGET_UNSUPPORTED_BLOCKED_REASON =
  "pdfium-wasm-target-unsupported-in-upstream-gn" as const;

export type PdfiumG1BlockedReason = typeof PDFIUM_WASM_TARGET_UNSUPPORTED_BLOCKED_REASON;

export function isPdfiumNativeProofBlockedByUpstreamGn(options: {
  writerExportsReady: boolean;
  classificationStubEnabled?: boolean;
}): boolean {
  if (options.writerExportsReady) return false;
  return options.classificationStubEnabled !== false;
}
