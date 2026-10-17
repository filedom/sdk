import type { RenderWireResponse } from "../../core/dist/wire/generated-response.js";
import {
  buildDocxRenderProjectionFromStore,
  type DocxLayoutEngine,
} from "../../core/dist/viewer/docx-render-projection.js";
import { detectDocumentKind } from "../../core/dist/formats/open/detect-document-kind.js";
import { searchDocumentParagraphs } from "../../core/dist/formats/text/document-search.js";
import { renderPdfPageBitmapBrowser } from "../../core/dist/formats/pdf/pdfium-browser-display.js";
import {
  paintRenderWireResponse,
  paintRgbaBitmapToCanvas,
} from "../../core/dist/compositor/canvas-paint.js";
import {
  openDocxProsemirrorDemoSessionSlice,
  buildDemoDocxZipBytes,
  type DocxProsemirrorDemoSessionSlice,
} from "../../core/dist/session/docx-prosemirror-demo-session-slice.js";
import { proseMirrorParagraphTexts } from "../../core/dist/formats/docx/docx-prosemirror-projection.js";
import type { DomdocShellElements } from "../../shell-ui/src/shell-layout.js";

export type ViewerDocumentKind = "docx" | "pdf" | "none";

export interface ViewerControllerOptions {
  shell: DomdocShellElements;
  engine: DocxLayoutEngine & {
    render_projection_json(input: string): string;
  };
  sessionStub: {
    documentId: string;
    kind: "flow" | "fixed";
    revisions: DocxProsemirrorDemoSessionSlice["session"]["stub"]["revisions"];
  };
  pdfiumGlueUrl: string;
  pdfiumLocateFile: (file: string) => string;
}

export class ViewerController {
  private pmSlice: DocxProsemirrorDemoSessionSlice;
  private pdfBytes: Uint8Array | null = null;
  private kind: ViewerDocumentKind = "docx";
  private lastResponse: RenderWireResponse | null = null;
  private pageWidthPt = 612;
  private pageHeightPt = 792;

  constructor(private readonly options: ViewerControllerOptions) {
    this.pmSlice = openDocxProsemirrorDemoSessionSlice(
      buildDemoDocxZipBytes("domdoc"),
      options.sessionStub,
    );
  }

  get slice(): DocxProsemirrorDemoSessionSlice {
    return this.pmSlice;
  }

  set slice(next: DocxProsemirrorDemoSessionSlice) {
    this.pmSlice = next;
  }

  documentKind(): ViewerDocumentKind {
    return this.kind;
  }

  async openBytes(bytes: Uint8Array, filename?: string): Promise<void> {
    const detection = detectDocumentKind(bytes, { filename });
    document.body.dataset.f02DetectedKind = detection.kind;
    this.options.shell.formatBadge.textContent = detection.kind;

    if (detection.kind === "encrypted-unsupported") {
      const legacyDoc = filename?.toLowerCase().endsWith(".doc");
      document.body.dataset.f01OpenOk = "false";
      document.body.dataset.f01OpenError = legacyDoc
        ? "legacy-doc-unsupported"
        : `encrypted:${detection.diagnostics.join(",")}`;
      this.options.shell.statusText.textContent = legacyDoc
        ? "Legacy .doc (binary) is not supported yet. Save as .docx or export to PDF."
        : "This file needs a password or uses an unsupported container.";
      return;
    }

    if (detection.kind === "pdf") {
      this.kind = "pdf";
      this.pdfBytes = bytes;
      document.body.dataset.f01OpenOk = "true";
      document.body.dataset.f01OpenKind = "pdf";
      document.body.dataset.f01OpenBytes = String(bytes.byteLength);
      this.options.shell.prosemirrorInput.disabled = true;
      await this.renderPdf(0);
      return;
    }

    if (detection.kind !== "docx") {
      document.body.dataset.f01OpenOk = "false";
      document.body.dataset.f01OpenError = `unsupported-kind:${detection.kind}`;
      this.options.shell.statusText.textContent = "Unsupported file type.";
      return;
    }

    this.kind = "docx";
    this.pdfBytes = null;
    this.options.shell.prosemirrorInput.disabled = false;
    this.pmSlice = openDocxProsemirrorDemoSessionSlice(bytes, this.options.sessionStub);
    document.body.dataset.f01OpenOk = "true";
    document.body.dataset.f01OpenKind = "docx";
    document.body.dataset.f01OpenBytes = String(bytes.byteLength);
    this.syncProsemirrorInput();
    await this.renderDocx();
  }

  syncProsemirrorInput(): void {
    const text = proseMirrorParagraphTexts(this.pmSlice.doc)[0] ?? "";
    this.options.shell.prosemirrorInput.value = text;
    document.body.dataset.m1ProsemirrorParagraph = text;
  }

  async renderDocx(): Promise<void> {
    const projection = buildDocxRenderProjectionFromStore({
      store: this.pmSlice.store,
      engine: this.options.engine,
      sessionId: this.options.sessionStub.documentId,
      documentGeneration: this.pmSlice.session.revisions.committedRevision,
    });
    this.pageWidthPt = projection.pages[0]?.widthPt ?? 612;
    this.pageHeightPt = projection.pages[0]?.heightPt ?? 792;
    const response = JSON.parse(
      this.options.engine.render_projection_json(JSON.stringify(projection)),
    ) as RenderWireResponse;
    this.lastResponse = response;
    this.paintResponse(response);
    document.body.dataset.paintItems = String(response.paint?.items?.length ?? 0);
    this.options.shell.statusText.textContent = `DOCX — ${projection.pages[0]?.runs.length ?? 0} line runs painted.`;
  }

  async renderPdf(pageIndex = 0): Promise<void> {
    if (!this.pdfBytes) return;
    const cssWidth = Math.min(
      this.options.shell.canvas.parentElement?.clientWidth ?? 640,
      900,
    );
    try {
      const bitmap = await renderPdfPageBitmapBrowser(this.pdfBytes, pageIndex, 1.5, {
        glueModuleUrl: this.options.pdfiumGlueUrl,
        locateFile: this.options.pdfiumLocateFile,
      });
      const ctx = this.options.shell.canvas.getContext("2d");
      if (!ctx) return;
      paintRgbaBitmapToCanvas(ctx, bitmap.rgba, bitmap.width, bitmap.height, cssWidth);
      document.body.dataset.paintItems = String(bitmap.width * bitmap.height);
      document.body.dataset.g1PdfiumBrowserRender = "true";
      this.options.shell.statusText.textContent = `PDF — page ${pageIndex + 1} (${bitmap.width}×${bitmap.height}px).`;
    } catch (error) {
      document.body.dataset.g1PdfiumBrowserRender = "false";
      document.body.dataset.f01OpenError = String(error);
      this.options.shell.statusText.textContent =
        "PDF preview unavailable (serve vendor/domdoc-pdfium-wasm or use DOCX).";
    }
  }

  paintResponse(response: RenderWireResponse): void {
    const ctx = this.options.shell.canvas.getContext("2d");
    if (!ctx) return;
    const cssWidth = Math.min(
      this.options.shell.canvas.parentElement?.clientWidth ?? 640,
      900,
    );
    paintRenderWireResponse(ctx, response, {
      pageWidthPt: this.pageWidthPt,
      pageHeightPt: this.pageHeightPt,
      cssWidthPx: cssWidth,
    });
  }

  applySearch(query: string): void {
    if (this.kind !== "docx") {
      document.body.dataset.f11HitCount = "0";
      return;
    }
    const hits = searchDocumentParagraphs(
      { paragraphTexts: proseMirrorParagraphTexts(this.pmSlice.doc) },
      query,
    );
    document.body.dataset.f11HitCount = String(hits.length);
  }
}
