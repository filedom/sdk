import type { RenderWireResponse } from "../../core/dist/wire/generated-response.js";
import { normalizeRenderWireResponse } from "../../core/dist/wire/normalize-render-wire-response.js";
import {
  buildDocxRenderProjectionFromStore,
  type DocxLayoutEngine,
} from "../../core/dist/viewer/docx-render-projection.js";
import { detectDocumentKind } from "../../core/dist/formats/open/detect-document-kind.js";
import { searchDocumentParagraphs } from "../../core/dist/formats/text/document-search.js";
import {
  paintRenderWireResponse,
  resolveViewerCanvasCssWidth,
  waitForViewerCanvasLayout,
} from "../../core/dist/compositor/canvas-paint.js";
import type { FormatModuleId } from "../../core/dist/loading/format-descriptor.js";
import { importLegacyDocStub } from "../../core/dist/formats/doc/legacy-doc-import-stub.js";
import {
  openDocxProsemirrorDemoSessionSlice,
  buildDemoDocxZipBytes,
  type DocxProsemirrorDemoSessionSlice,
} from "../../core/dist/session/docx-prosemirror-demo-session-slice.js";
import { proseMirrorParagraphTexts } from "../../core/dist/formats/docx/docx-prosemirror-projection.js";
import type { DomdocShellElements } from "../../shell-ui/src/shell-layout.js";

export type ViewerDocumentKind = "docx" | "pdf" | "none";

export type DisplayEngineLike = DocxLayoutEngine & {
  render_projection_json(input: string): string;
};

export interface ViewerControllerOptions {
  shell: DomdocShellElements;
  getEngine: () => Promise<DisplayEngineLike>;
  loadFormatModule?: (id: FormatModuleId, sessionGeneration: number) => Promise<unknown>;
  loadPdfPreview?: (
    canvas: HTMLCanvasElement,
    pdfBytes: Uint8Array,
    pageIndex: number,
    cssWidthPx: number,
  ) => Promise<{ width: number; height: number; pixelCount: number }>;
  sessionStub: {
    documentId: string;
    kind: "flow" | "fixed";
    revisions: DocxProsemirrorDemoSessionSlice["session"]["stub"]["revisions"];
  };
}

export class ViewerController {
  private pmSlice: DocxProsemirrorDemoSessionSlice;
  private pdfBytes: Uint8Array | null = null;
  private kind: ViewerDocumentKind = "docx";
  private lastResponse: RenderWireResponse | null = null;
  private pageWidthPt = 612;
  private pageHeightPt = 792;
  private pdfRenderMutex: Promise<void> = Promise.resolve();
  private repaintInFlight: Promise<void> | null = null;

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
    try {
      await this.openBytesInner(bytes, filename);
    } catch (error) {
      document.body.dataset.f01OpenOk = "false";
      document.body.dataset.f01RenderError = error instanceof Error ? error.message : String(error);
      this.options.shell.statusText.textContent = "Could not render this file.";
      throw error;
    }
  }

  /** Re-paint the current document (e.g. after container resize). */
  async repaint(): Promise<void> {
    if (this.repaintInFlight) {
      await this.repaintInFlight;
      return;
    }
    this.repaintInFlight = this.repaintInner().finally(() => {
      this.repaintInFlight = null;
    });
    await this.repaintInFlight;
  }

  private async repaintInner(): Promise<void> {
    if (this.kind === "pdf" && this.pdfBytes) {
      await this.renderPdf(0);
      return;
    }
    if (this.lastResponse) {
      this.paintResponse(this.lastResponse);
    }
  }

  private viewerCanvasTargetWidth(): number {
    return resolveViewerCanvasCssWidth(this.options.shell.canvas.parentElement);
  }

  private recordCanvasPaintMetrics(): void {
    const canvas = this.options.shell.canvas;
    document.body.dataset.viewerCanvasWidth = String(canvas.width);
    document.body.dataset.viewerCanvasHeight = String(canvas.height);
  }

  private async openBytesInner(bytes: Uint8Array, filename?: string): Promise<void> {
    await waitForViewerCanvasLayout();
    const detection = detectDocumentKind(bytes, { filename });
    document.body.dataset.f02DetectedKind = detection.kind;
    this.options.shell.formatBadge.textContent = detection.kind;

    if (detection.kind === "encrypted-ooxml") {
      document.body.dataset.f01OpenOk = "false";
      document.body.dataset.f01OpenError = "encrypted-ooxml";
      this.options.shell.statusText.textContent =
        "Password-protected Office document. Decryption is not implemented in this build.";
      return;
    }

    if (detection.kind === "encrypted-unsupported") {
      document.body.dataset.f01OpenOk = "false";
      document.body.dataset.f01OpenError = `encrypted:${detection.diagnostics.join(",")}`;
      this.options.shell.statusText.textContent =
        "This file uses an unsupported encrypted or compound container.";
      return;
    }

    if (detection.kind === "legacy-doc") {
      await this.options.loadFormatModule?.("legacy-doc-importer", 0);
      const imported = importLegacyDocStub(bytes);
      document.body.dataset.f165LegacyDocSupported = imported.supported ? "true" : "false";
      document.body.dataset.f165LegacyDocParser = imported.parserId;
      document.body.dataset.f01OpenOk = "false";
      document.body.dataset.f01OpenError = imported.lossReport[0]?.code ?? "legacy-doc-import-failed";
      this.options.shell.statusText.textContent = imported.supported
        ? "Legacy DOC imported (see conversion report)."
        : "Legacy .doc detected. Full import (F165) is not integrated yet — save as .docx or PDF.";
      return;
    }

    if (detection.kind === "pdf") {
      this.kind = "pdf";
      this.pdfBytes = bytes;
      document.body.dataset.f01OpenKind = "pdf";
      document.body.dataset.f01OpenBytes = String(bytes.byteLength);
      this.options.shell.prosemirrorInput.disabled = true;
      await this.renderPdf(0);
      document.body.dataset.f01OpenOk = "true";
      document.body.dataset.engineReady = "true";
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
    document.body.dataset.f01OpenKind = "docx";
    document.body.dataset.f01OpenBytes = String(bytes.byteLength);
    this.syncProsemirrorInput();
    await this.renderDocx();
    document.body.dataset.f01OpenOk = "true";
    document.body.dataset.engineReady = "true";
    await waitForViewerCanvasLayout();
    if (this.lastResponse) {
      this.paintResponse(this.lastResponse);
    }
  }

  syncProsemirrorInput(): void {
    const text = proseMirrorParagraphTexts(this.pmSlice.doc)[0] ?? "";
    this.options.shell.prosemirrorInput.value = text;
    document.body.dataset.m1ProsemirrorParagraph = text;
  }

  async renderDocx(): Promise<void> {
    const generation = this.pmSlice.session.revisions.committedRevision;
    await this.options.loadFormatModule?.("docx-adapter", generation);
    const engine = await this.options.getEngine();
    const projection = buildDocxRenderProjectionFromStore({
      store: this.pmSlice.store,
      engine,
      sessionId: this.options.sessionStub.documentId,
      documentGeneration: this.pmSlice.session.revisions.committedRevision,
    });
    if ((projection.pages[0]?.runs.length ?? 0) === 0) {
      throw new Error("docx-projection-empty");
    }
    this.pageWidthPt = projection.pages[0]?.widthPt ?? 612;
    this.pageHeightPt = projection.pages[0]?.heightPt ?? 792;
    const response = normalizeRenderWireResponse(
      JSON.parse(engine.render_projection_json(JSON.stringify(projection))) as RenderWireResponse,
    );
    if ((response.paint?.items?.length ?? 0) === 0) {
      throw new Error("render-wire-empty-paint");
    }
    this.lastResponse = response;
    this.paintResponse(response);
    document.body.dataset.paintItems = String(response.paint?.items?.length ?? 0);
    document.body.dataset.f01RenderError = "";
    this.recordCanvasPaintMetrics();
    this.options.shell.statusText.textContent = `DOCX — ${projection.pages[0]?.runs.length ?? 0} line runs painted.`;
  }

  async renderPdf(pageIndex = 0): Promise<void> {
    if (!this.pdfBytes) return;
    let release!: () => void;
    const slot = new Promise<void>((resolve) => {
      release = resolve;
    });
    const waitTurn = this.pdfRenderMutex;
    this.pdfRenderMutex = waitTurn.then(() => slot);
    await waitTurn;
    try {
      const cssWidth = this.viewerCanvasTargetWidth();
      await this.options.loadFormatModule?.("pdf-display", 0);
      const paint = this.options.loadPdfPreview;
      if (!paint) throw new Error("pdf-preview-not-configured");
      const painted = await paint(this.options.shell.canvas, this.pdfBytes, pageIndex, cssWidth);
      this.lastResponse = null;
      document.body.dataset.paintItems = String(painted.pixelCount);
      document.body.dataset.pdfJsRender = "true";
      document.body.dataset.g1PdfiumBrowserRender = "false";
      document.body.dataset.f01RenderError = "";
      this.recordCanvasPaintMetrics();
      this.options.shell.statusText.textContent = `PDF — page ${pageIndex + 1} (${painted.width}×${painted.height}px).`;
    } finally {
      release();
    }
  }

  paintResponse(response: RenderWireResponse): void {
    const ctx = this.options.shell.canvas.getContext("2d");
    if (!ctx) throw new Error("canvas-2d-unavailable");
    const cssWidth = this.viewerCanvasTargetWidth();
    paintRenderWireResponse(ctx, response, {
      pageWidthPt: this.pageWidthPt,
      pageHeightPt: this.pageHeightPt,
      cssWidthPx: cssWidth,
    });
    this.recordCanvasPaintMetrics();
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
