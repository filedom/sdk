import { describe, expect, it } from "vitest";
import {
  PDFIUM_RENDER_COMMIT,
  PDFIUM_SOURCE_COMMIT,
  PDFIUM_WASM_MODULE_SPEC,
} from "./pdfium-pin.js";
import {
  PdfiumWasmWriterBackend,
  tryLoadPdfiumWasmModule,
} from "./backends/pdfium-wasm-backend.js";
import { createPdfWriterSession } from "./writer.js";

const MINIMAL_PDF = new Uint8Array([
  ...new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF\n"),
]);

describe("G1-PDF-02 pdfium wasm evaluation", () => {
  it("records C24/C25 licence pins", () => {
    expect(PDFIUM_SOURCE_COMMIT).toHaveLength(40);
    expect(PDFIUM_RENDER_COMMIT).toHaveLength(40);
    expect(PDFIUM_WASM_MODULE_SPEC).toContain("domdoc-pdfium-wasm");
  });

  it("does not load unpublished PDFium WASM module in node CI", async () => {
    const load = await tryLoadPdfiumWasmModule();
    expect(load.loaded).toBe(false);
    expect(load.pdfiumSourceCommit).toBe(PDFIUM_SOURCE_COMMIT);
  });

  it("classifies module-missing vs loaded-not-implemented preflight reasons", async () => {
    const missing = await PdfiumWasmWriterBackend.create();
    const missingPreflight = await missing.preflight(MINIMAL_PDF, {
      revision: 0,
      sourceSha256: "abc",
      byteLength: MINIMAL_PDF.byteLength,
    });
    expect(missingPreflight.ok).toBe(true);
    if (missingPreflight.ok) {
      expect(missingPreflight.capabilities.reason).toBe("backend-not-configured");
    }

    const loadedBackend = new PdfiumWasmWriterBackend({
      loaded: true,
      moduleSpec: PDFIUM_WASM_MODULE_SPEC,
      pdfiumSourceCommit: PDFIUM_SOURCE_COMMIT,
      pdfiumRenderCommit: PDFIUM_RENDER_COMMIT,
    });
    const loadedPreflight = await loadedBackend.preflight(MINIMAL_PDF, {
      revision: 0,
      sourceSha256: "abc",
      byteLength: MINIMAL_PDF.byteLength,
    });
    if (loadedPreflight.ok) {
      expect(loadedPreflight.capabilities.reason).toBe("partial-run-not-implemented");
    }
  });

  it("apply uses backend-not-configured when module missing", async () => {
    const backend = await PdfiumWasmWriterBackend.create();
    backend.registerContext("ctx", { revision: 0, sourceSha256: "x", byteLength: 1 });
    const apply = await backend.apply("ctx", [
      {
        kind: "replaceTextRun",
        pageIndex: 0,
        objectId: "o",
        newText: "t",
        expectedRevision: 0,
      },
    ]);
    expect(apply.ok).toBe(false);
    if (!apply.ok) expect(apply.code).toBe("backend-not-configured");
  });

  it("apply uses partial-run-not-implemented when module loaded", async () => {
    const backend = new PdfiumWasmWriterBackend({
      loaded: true,
      moduleSpec: PDFIUM_WASM_MODULE_SPEC,
      pdfiumSourceCommit: PDFIUM_SOURCE_COMMIT,
      pdfiumRenderCommit: PDFIUM_RENDER_COMMIT,
    });
    backend.registerContext("ctx", { revision: 0, sourceSha256: "x", byteLength: 1 });
    const apply = await backend.apply("ctx", [
      {
        kind: "replaceTextRun",
        pageIndex: 0,
        objectId: "o",
        newText: "t",
        expectedRevision: 0,
      },
    ]);
    expect(apply.ok).toBe(false);
    if (!apply.ok) expect(apply.code).toBe("partial-run-not-implemented");
  });

  it("pdfium-wasm backend preflights PDF but native edits stay unsupported", async () => {
    const backend = await PdfiumWasmWriterBackend.create();
    expect(backend.id).toBe("pdfium-wasm");
    const session = await createPdfWriterSession(MINIMAL_PDF, {
      expectedRevision: 1,
      backend,
    });
    const preflight = await session.preflight(MINIMAL_PDF);
    expect(preflight.ok).toBe(true);
    if (preflight.ok) {
      expect(preflight.capabilities.nativeTextReplace).toBe("unsupported");
    }
    await session.dispose();
  });

  /** P01–P05 positive native proofs — gate remains not-run until WASM artifact exists. */
  it.each([
    ["P01", "replace whole text run"],
    ["P02", "partial run insert/delete"],
    ["P03", "multi-run kerning replace"],
    ["P04", "delete native text object"],
    ["P05", "image replace and page reorder"],
  ] as const)("feasibility %s (%s) not-run without vendored PDFium WASM", async () => {
    const backend = await PdfiumWasmWriterBackend.create();
    const session = await createPdfWriterSession(MINIMAL_PDF, {
      expectedRevision: 0,
      backend,
    });
    const apply = await session.apply([
      {
        kind: "replaceTextRun",
        pageIndex: 0,
        objectId: "native-obj-0",
        newText: "proof",
        expectedRevision: 0,
      },
    ]);
    expect(apply.ok).toBe(false);
    await session.dispose();
  });
});
