import { describe, expect, it, vi } from "vitest";
import { BundleLoader } from "./bundles.js";
import type { EngineModule } from "./engine-types.js";
import { DomdocError } from "./errors.js";
import { CoreLoader, enginesFromCdn, loadingLabel, planLoad, type EngineSources, type TrackChangesModule } from "./modules.js";
import { openDocument } from "./open.js";

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
const DOCX = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
const DOC = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

function engine(format: string, opened: Uint8Array[] = []): EngineModule {
  return {
    default: async () => {},
    format: () => format,
    open(bytes) {
      opened.push(bytes);
      return {
        info: () => JSON.stringify({ format, pageCount: 1, capabilities: {}, warnings: [] }),
        free: () => {},
      } as never;
    },
  };
}

function sources(over: Partial<EngineSources> = {}): EngineSources {
  return {
    core: async () => ({}),
    pdfiumWasm: "https://cdn.example/pdf/pdfium.wasm",
    pdfiumRender: async () => engine("pdf"),
    officeOxide: async () => engine("docx"),
    ...over,
  };
}

describe("planLoad", () => {
  it("loads pdfium and pdfium-render for a PDF the host enabled", () => {
    const plan = planLoad(PDF, "notes.pdf", { pdf: true });
    expect(plan).toEqual({
      format: "pdf",
      source: "original",
      modules: [
        { id: "pdfium", role: "engine" },
        { id: "pdfium-render", role: "wrapper" },
      ],
    });
  });

  it("loads office_oxide for doc and docx", () => {
    expect(planLoad(DOCX, "a.docx", { docx: true }).modules.map((module) => module.id)).toEqual(["office-oxide"]);
    expect(planLoad(DOC, "a.doc", { doc: true }).modules.map((module) => module.id)).toEqual(["office-oxide"]);
  });

  it("does not plan a format the host left off", () => {
    expect(() => planLoad(PDF, "notes.pdf", { docx: true })).toThrow(DomdocError);
    expect(() => planLoad(PDF, "notes.pdf", { docx: true })).toThrow(/format-disabled/);
  });

  it("adds track changes on the original file, domdoc-only for PDF", () => {
    const pdf = planLoad(PDF, "notes.pdf", { pdf: true, trackChanges: true });
    const docx = planLoad(DOCX, "a.docx", { docx: true, trackChanges: true });
    expect(pdf.modules.at(-1)).toEqual({ id: "track-changes", role: "revisions", visibleIn: "domdoc" });
    expect(docx.modules.at(-1)).toEqual({ id: "track-changes", role: "revisions", visibleIn: "file" });
    expect(pdf.source).toBe("original");
  });

  it("names the blank page after the file type", () => {
    expect(loadingLabel("pdf")).toBe("Loading PDF");
    expect(loadingLabel("docx")).toBe("Loading Word");
    expect(loadingLabel("doc")).toBe("Loading Word");
  });
});

describe("CoreLoader", () => {
  it("fetches pdfium wasm and the pdfium-render wrapper, and skips office_oxide", async () => {
    const wasm = new Uint8Array([1, 2, 3]).buffer;
    const init = vi.fn(async () => {});
    const pdfiumRender = vi.fn(async () => ({ ...engine("pdf"), default: init }));
    const officeOxide = vi.fn(async () => engine("docx"));
    const fetchMock = vi.fn(async () => new Response(wasm));
    vi.stubGlobal("fetch", fetchMock);

    const loader = new CoreLoader({ pdf: true, docx: true }, sources({ pdfiumRender, officeOxide }));

    const prepared = await loader.prepare(PDF, "notes.pdf");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith("https://cdn.example/pdf/pdfium.wasm");
    expect(pdfiumRender).toHaveBeenCalledOnce();
    expect(officeOxide).not.toHaveBeenCalled();
    expect(init).toHaveBeenCalledWith({ wasmBinary: wasm });
    expect(prepared.original).toBe(PDF);
    expect(loader.requested()).toEqual(["core", "pdfium", "pdfium-render"]);
    vi.unstubAllGlobals();
  });

  it("loads office_oxide once for doc and docx, and track changes only when set", async () => {
    const opened: Uint8Array[] = [];
    const officeOxide = vi.fn(async () => engine("docx", opened));
    const track = vi.fn(async (): Promise<TrackChangesModule> => ({ attach: () => {} }));
    const loader = new CoreLoader(
      { doc: true, docx: true, trackChanges: true },
      sources({ officeOxide, trackChanges: track }),
    );

    await loader.prepare(DOC, "a.doc");
    await loader.prepare(DOCX, "a.docx");
    expect(officeOxide).toHaveBeenCalledOnce();
    expect(track).toHaveBeenCalledOnce();
    expect(loader.requested()).toEqual(["core", "office-oxide", "track-changes"]);
  });

  it("does not fetch when the host disabled the format", async () => {
    const officeOxide = vi.fn(async () => engine("docx"));
    const loader = new CoreLoader({ docx: true }, sources({ officeOxide }));
    await expect(loader.prepare(PDF, "notes.pdf")).rejects.toMatchObject({ code: "format-disabled" });
    expect(officeOxide).not.toHaveBeenCalled();
    expect(loader.requested()).toEqual([]);
  });

  it("shows the core shell first, then starts the file's engines together", async () => {
    const order: string[] = [];
    let releaseCore!: () => void;
    const coreGate = new Promise<void>((resolve) => {
      releaseCore = resolve;
    });
    let releaseWasm!: (buffer: ArrayBuffer) => void;
    const wasmGate = new Promise<ArrayBuffer>((resolve) => {
      releaseWasm = resolve;
    });
    let releaseRender!: (module: EngineModule) => void;
    const renderGate = new Promise<EngineModule>((resolve) => {
      releaseRender = resolve;
    });
    let releaseTrack!: (module: TrackChangesModule) => void;
    const trackGate = new Promise<TrackChangesModule>((resolve) => {
      releaseTrack = resolve;
    });

    const loader = new CoreLoader(
      { pdf: true, docx: true, trackChanges: true },
      sources({
        core: () => {
          order.push("core");
          return coreGate;
        },
        pdfiumRender: () => {
          order.push("pdfium-render");
          return renderGate;
        },
        officeOxide: () => {
          order.push("office-oxide");
          return Promise.resolve(engine("docx"));
        },
        trackChanges: () => {
          order.push("track-changes");
          return trackGate;
        },
      }),
    );
    vi.stubGlobal("fetch", () => {
      order.push("pdfium");
      return wasmGate.then((buffer) => new Response(buffer));
    });

    const pending = loader.prepare(PDF, "notes.pdf");
    await Promise.resolve();
    expect(order).toEqual(["core"]);

    releaseCore();
    await Promise.resolve();
    await Promise.resolve();
    expect(order.slice(0, 4).sort()).toEqual(["core", "pdfium", "pdfium-render", "track-changes"]);
    expect(order).not.toContain("office-oxide");

    releaseWasm(new ArrayBuffer(4));
    releaseRender(engine("pdf"));
    releaseTrack({ attach() {} });
    await pending;
    vi.unstubAllGlobals();
  });
});

describe("openDocument with the core loader", () => {
  it("opens the original PDF through pdfium-render and skips the format bundle", async () => {
    const opened: Uint8Array[] = [];
    const bundle = vi.fn();
    const attach = vi.fn();
    const loader = new BundleLoader({ pdf: bundle });
    const session = new CoreLoader(
      { pdf: true, trackChanges: true },
      sources({
        pdfiumRender: async () => engine("pdf", opened),
        trackChanges: async () => ({ attach }),
      }),
    );
    vi.stubGlobal("fetch", async () => new Response(new Uint8Array([9])));

    const doc = await openDocument(loader, PDF, { name: "notes.pdf", core: session });
    expect(bundle).not.toHaveBeenCalled();
    expect(opened).toEqual([PDF]);
    expect(attach).toHaveBeenCalledWith({
      format: "pdf",
      original: PDF,
      visibleIn: "domdoc",
      session: expect.anything(),
    });
    expect(doc.format).toBe("pdf");
    doc.dispose();
    vi.unstubAllGlobals();
  });
});

describe("enginesFromCdn", () => {
  it("points PDF, Word, and track changes at separate paths", () => {
    const sources = enginesFromCdn("https://cdn.example.com/domdoc/v1/");
    expect(sources.pdfiumWasm).toBe("https://cdn.example.com/domdoc/v1/pdf/pdfium.wasm");
    expect(sources.core).toEqual(expect.any(Function));
    expect(sources.pdfiumRender).toEqual(expect.any(Function));
    expect(sources.officeOxide).toEqual(expect.any(Function));
    expect(sources.trackChanges).toEqual(expect.any(Function));
  });
});
