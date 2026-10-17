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
