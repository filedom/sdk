import {
  detectDocumentKind,
  type DocumentKindDetection,
} from "../open/detect-document-kind.js";
import { fitPageZoom } from "../../compositor/view-transform.js";
import { DocxStore } from "./docx-store.js";

/** G2 minimal import path feature IDs (F02 detect, F07 view transform unchanged). */
export const DOCX_IMPORT_MINIMAL_DETECTION_FEATURE_ID = "F02" as const;
export const DOCX_IMPORT_MINIMAL_VIEW_TRANSFORM_FEATURE_ID = "F07" as const;

export interface DocxImportMinimalResult {
  ok: boolean;
  detection: DocumentKindDetection;
  store: DocxStore | null;
  detail: string;
  /** F07: fit-page zoom from canonical US Letter pt dims (layout stays in points). */
  fitPageZoom: number;
}

const DEFAULT_PAGE_PT = { pageWidthPt: 612, pageHeightPt: 792 } as const;

function defaultFitPageZoom(viewportWidthCssPx = 800, viewportHeightCssPx = 600): number {
  return fitPageZoom({
    ...DEFAULT_PAGE_PT,
    rotationDeg: 0,
    viewportWidthCssPx,
    viewportHeightCssPx,
  });
}

/** G2: F02-detect exported DOCX bytes, then open DocxStore (gate not-run). */
export function importDocxStoreFromExportedBytes(
  bytes: Uint8Array,
  hint?: { mime?: string; filename?: string },
): DocxImportMinimalResult {
  const fitZoom = defaultFitPageZoom();
  const detection = detectDocumentKind(bytes, hint);
  if (detection.kind !== "docx" || detection.adapter !== "docx") {
    return {
      ok: false,
      detection,
      store: null,
      detail: "detected-non-docx",
      fitPageZoom: fitZoom,
    };
  }
  try {
    const store = DocxStore.open(bytes);
    return {
      ok: true,
      detection,
      store,
      detail: "docx-store-opened",
      fitPageZoom: fitZoom,
    };
  } catch {
    return {
      ok: false,
      detection,
      store: null,
      detail: "docx-store-open-failed",
      fitPageZoom: fitZoom,
    };
  }
}
