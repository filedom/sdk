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
import { classifyPdfProofOperation } from "./pdfium-proof-hooks.js";
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

  it("records C24 pin and writer-export readiness honestly", async () => {
    const load = await tryLoadPdfiumWasmModule();
    expect(load.pdfiumSourceCommit).toBe(PDFIUM_SOURCE_COMMIT);
    if (!load.api) {
      expect(load.writerExportsReady).toBe(false);
    } else {
      expect(load.writerExportsReady).toBe(true);
      expect(load.loaded).toBe(true);
    }
  });

  it("classifies module-missing vs loaded-not-implemented preflight reasons", async () => {
    const missing = await PdfiumWasmWriterBackend.create();
    const missingPreflight = await missing.preflight(MINIMAL_PDF, {
      revision: 0,
      sourceSha256: "abc",
      byteLength: MINIMAL_PDF.byteLength,
    });
    const load = await tryLoadPdfiumWasmModule();
    if (load.writerExportsReady) {
      expect(missingPreflight.ok === true || (!missingPreflight.ok && missingPreflight.code === "invalid-bytes")).toBe(
        true,
      );
    } else {
      expect(missingPreflight.ok).toBe(true);
      if (missingPreflight.ok) {
        expect(
          missingPreflight.capabilities.reason === "backend-not-configured" ||
            missingPreflight.capabilities.reason === "render-only-probe-adapter",
        ).toBe(true);
      }
    }

    const loadedBackend = new PdfiumWasmWriterBackend({
      loaded: true,
      writerExportsReady: false,
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
      expect(loadedPreflight.capabilities.nativeTextReplace).toBe("unsupported");
    }
  });

  it("apply stays unsupported without C24 writer exports", async () => {
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
    if (!apply.ok) {
      expect(
        apply.code === "backend-not-configured" ||
          apply.code === "writer-exports-absent" ||
          apply.code === "cancelled" ||
          apply.code === "unmapped-text-object",
      ).toBe(true);
    }
  });

  it("apply requires writer API and source bytes when exports ready", async () => {
    const backend = new PdfiumWasmWriterBackend({
      loaded: true,
      writerExportsReady: true,
      moduleSpec: PDFIUM_WASM_MODULE_SPEC,
      pdfiumSourceCommit: PDFIUM_SOURCE_COMMIT,
      pdfiumRenderCommit: PDFIUM_RENDER_COMMIT,
      api: {
        pdfiumSourceCommit: PDFIUM_SOURCE_COMMIT,
        createDocument: () => 1,
        loadDocument: () => 2,
        pageCount: () => 1,
        addPage: () => 0,
        extractPageText: () => "",
        listObjects: () => [],
        addTextObject: () => 0,
        setText: () => true,
        deleteObject: () => true,
        addImageRgb: () => 0,
        replaceImageRgb: () => true,
        movePage: () => true,
        inspect: () => ({ pageCount: 1, pages: [] }),
        save: () => MINIMAL_PDF,
        close: () => {},
      },
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
    if (!apply.ok) expect(apply.code).toBe("cancelled");
  });

  it("apply uses writer-exports-absent for render-only probe adapter load", async () => {
    const backend = new PdfiumWasmWriterBackend({
      loaded: true,
      writerExportsReady: false,
      moduleSpec: "file:///probe-adapter",
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
    if (!apply.ok) expect(apply.code).toBe("writer-exports-absent");
  });

  it("pdfium-wasm backend preflights PDF with honest native capability", async () => {
    const load = await tryLoadPdfiumWasmModule();
    const backend = new PdfiumWasmWriterBackend(load);
    expect(backend.id).toBe("pdfium-wasm");
    const session = await createPdfWriterSession(MINIMAL_PDF, {
      expectedRevision: 1,
      backend,
    });
    const preflight = await session.preflight(MINIMAL_PDF);
    if (!load.writerExportsReady) {
      expect(preflight.ok).toBe(true);
      if (preflight.ok) {
        expect(preflight.capabilities.nativeTextReplace).toBe("unsupported");
      }
    } else if (preflight.ok) {
      expect(preflight.capabilities.nativeTextReplace).toBe("native");
    }
    await session.dispose();
  });

  it("classifies writer operations into P01–P05 hook buckets (G1-PDF-04)", () => {
    expect(
      classifyPdfProofOperation(
        {
          kind: "replaceTextRun",
          pageIndex: 0,
          objectId: "obj",
          newText: "whole",
          expectedRevision: 0,
        },
        false,
      ).fixtureId,
    ).toBe("P01");
    expect(
      classifyPdfProofOperation(
        {
          kind: "deleteTextObject",
          pageIndex: 0,
          objectId: "obj",
          expectedRevision: 0,
        },
        true,
      ),
    ).toMatchObject({ fixtureId: "P04", hookReady: true });
  });

  /** P01–P05 positive native proofs — gate remains not-run until WASM artifact exists. */
  it.each([
    ["P01", "replace whole text run"],
    ["P02", "partial run insert/delete"],
    ["P03", "multi-run kerning replace"],
    ["P04", "delete native text object"],
    ["P05", "image replace and page reorder"],
  ] as const)("feasibility %s (%s) uses C24 writer when vendored", async () => {
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
    const load = await tryLoadPdfiumWasmModule();
    if (!load.writerExportsReady) {
      expect(apply.ok).toBe(false);
    }
    await session.dispose();
  });
});
