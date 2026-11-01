import { embedPdfium } from "../../../../domdoc-wasm/scripts/pdfium-section.mjs";
import { describe, expect, it, vi } from "vitest";
import { BundleLoader } from "./bundles.js";
import { bundleLoadNotice, bundleUrl, bundlesFromCdn, type GlueLoader } from "./cdn.js";
import type { EngineSession } from "./engine-types.js";
import { DomdocError } from "./errors.js";
import { openDocument } from "./open.js";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

function session(format: string): EngineSession {
  return {
    info: () =>
      JSON.stringify({
        format,
        pageCount: 1,
        trackChanges: false,
        author: "",
        pendingRevisions: 0,
        exportExtension: format,
        exportMime: "",
        canUndo: false,
        canRedo: false,
        capabilities: {
          editText: false,
          editStructure: false,
          formatText: false,
          formatParagraph: false,
          flowEmbeds: false,
          transform: false,
          layers: false,
          insert: false,
        },
        warnings: [],
      }),
    free: () => {},
  } as EngineSession;
}

describe("CDN bundles", () => {
  it("points each format at its own glue module", () => {
    const base = "https://cdn.example.com/domdoc/v1";
    for (const format of ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "png", "jpeg", "gif", "webp", "bmp", "tiff", "svg", "ai"] as const) {
      expect(bundleUrl(`${base}/`, format)).toBe(`${base}/${format}/domdoc_${format}.js`);
    }
    expect(bundleUrl(base, "docx")).not.toContain("office");
    expect(bundleUrl(base, "7z")).toBe(`${base}/7z/domdoc_7z.js`);
    expect(Object.keys(bundlesFromCdn(base)).sort()).toEqual([
      "7z",
      "ai",
      "bmp",
      "csv",
      "doc",
      "docx",
      "eml",
      "gif",
      "gzip",
      "jpeg",
      "m4a",
      "mp3",
      "mp4",
      "mpeg",
      "msg",
      "pdf",
      "png",
      "ppt",
      "pptx",
      "svg",
      "tar",
      "tiff",
      "wav",
      "webm",
      "webp",
      "xls",
      "xlsx",
      "zip",
    ]);
  });

  it("opening a PNG requests the PNG module only, then reuses it", async () => {
    const requested: string[] = [];
    const load: GlueLoader = async (url) => {
      requested.push(url);
      const format = url.split("/").at(-2) ?? "png";
      return {
        default: async () => {},
        format: () => format,
        open: () => session(format),
      };
    };
    const fetchMock = vi.fn(async (url: string) => {
      requested.push(String(url));
      return new Response(new Uint8Array([0, 97, 115, 109]));
    });
    vi.stubGlobal("fetch", fetchMock);

    const loader = new BundleLoader(bundlesFromCdn("https://cdn.example/v1", { load }));
    const first = await openDocument(loader, PNG, { name: "photo.png" });
    const second = await openDocument(loader, PNG, { name: "other.png" });
    expect(first.format).toBe("png");
    expect(second.format).toBe("png");
    expect(requested).toEqual([
      "https://cdn.example/v1/png/domdoc_png.js",
      "https://cdn.example/v1/png/domdoc_png_bg.wasm",
    ]);
    expect(requested.some((url) => /svg|pdf|docx|pdfium/i.test(url))).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    first.dispose();
    second.dispose();
    vi.unstubAllGlobals();
  });

  it("opens PDF from the pdf wasm and does not fetch pdfium.wasm", async () => {
    const requested: string[] = [];
    const module = embedPdfium(wasmBytes().subarray(0, 8), wasmBytes());
    const load: GlueLoader = async (url) => {
      requested.push(url);
      return {
        default: async () => {},
        open: () => session("pdf"),
      };
    };
    vi.stubGlobal("fetch", async (url: string) => {
      requested.push(String(url));
      return new Response(module);
    });
    const loader = new BundleLoader(bundlesFromCdn("https://cdn.example/v1", { load }));
    await expect(openDocument(loader, PDF, { name: "notes.pdf" })).rejects.toThrow(/PDF engine module is incomplete/);
    expect(requested).toEqual([
      "https://cdn.example/v1/pdf/domdoc_pdf.js",
      "https://cdn.example/v1/pdf/domdoc_pdf_bg.wasm",
    ]);
    expect(requested.some((url) => url.endsWith("pdfium.wasm"))).toBe(false);
    vi.unstubAllGlobals();
  });

  it("refuses a PDF engine wasm that does not embed its renderer before open", async () => {
    const requested: string[] = [];
    const load: GlueLoader = async (url) => {
      requested.push(url);
      return {
        default: async () => {},
        open: () => session("pdf"),
        initialize_pdfium_render: () => true,
      };
    };
    vi.stubGlobal("fetch", async (url: string) => {
      requested.push(String(url));
      return new Response(wasmBytes(), { headers: { "x-domdoc-license": "trial" } });
    });
    try {
      const loader = new BundleLoader(bundlesFromCdn("https://cdn.example/v1", { load }));
      const opening = openDocument(loader, PDF, { name: "notes.pdf" });
      await expect(opening).rejects.toBeInstanceOf(DomdocError);
      await expect(opening).rejects.toThrow(/PDF engine bundle is incomplete/);
      expect(requested).toEqual([
        "https://cdn.example/v1/pdf/domdoc_pdf.js",
        "https://cdn.example/v1/pdf/domdoc_pdf_bg.wasm",
      ]);
      expect(requested.some((url) => url.endsWith("pdfium.wasm"))).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("requests glue and wasm with no ticket", async () => {
    const requested: string[] = [];
    const tickets: Array<string | null> = [];
    const module = embedPdfium(wasmBytes().subarray(0, 8), wasmBytes());
    const load: GlueLoader = async (url) => {
      requested.push(url);
      return { default: async () => {}, open: () => session("pdf") };
    };
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      requested.push(String(url));
      tickets.push(new Headers(init?.headers).get("x-domdoc-ticket"));
      return new Response(module);
    });
    try {
      const loader = new BundleLoader(bundlesFromCdn("https://cdn.example/v1", { load }));
      await expect(openDocument(loader, PDF, { name: "notes.pdf" })).rejects.toThrow(/PDF engine module is incomplete/);
      expect(requested).toEqual([
        "https://cdn.example/v1/pdf/domdoc_pdf.js",
        "https://cdn.example/v1/pdf/domdoc_pdf_bg.wasm",
      ]);
      expect(tickets).toEqual([null]);
      expect(requested.some((url) => url.includes("ticket="))).toBe(false);
      expect(requested.some((url) => url.endsWith("pdfium.wasm"))).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("accepts plaintext wasm and refuses a buffer that is not a wasm module", async () => {
    const plain = wasmBytes();
    const opened = await openPng(plain);
    expect(Array.from(opened.module!)).toEqual(Array.from(plain));
    expect(Array.from(opened.module!.subarray(0, 4))).toEqual([0x00, 0x61, 0x73, 0x6d]);
    expectPngOnly(opened.requested);
    expect(opened.notice.trial).toBe(false);
    opened.doc.dispose();

    const sealed = await sealWasm(plain, contentKey());
    expect(String.fromCharCode(sealed[0]!, sealed[1]!, sealed[2]!, sealed[3]!)).toBe("DDW1");
    const decrypt = vi.spyOn(crypto.subtle, "decrypt");
    try {
      await expect(openPng(sealed)).rejects.toThrow(/not a wasm module/);
      expect(decrypt).not.toHaveBeenCalled();
    } finally {
      decrypt.mockRestore();
    }
  });
});

function wasmBytes(): Uint8Array<ArrayBuffer> {
  return bytes([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x68, 0x69]);
}

function contentKey(): Uint8Array<ArrayBuffer> {
  const key = new Uint8Array(new ArrayBuffer(32));
  key[0] = 7;
  return key;
}

function bytes(values: number[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(values.length));
  out.set(values);
  return out;
}

async function sealWasm(plain: Uint8Array<ArrayBuffer>, key: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const iv = new Uint8Array(new ArrayBuffer(12));
  iv[0] = 9;
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "AES-GCM" }, false, ["encrypt"]);
  const body = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, plain));
  const out = new Uint8Array(new ArrayBuffer(4 + iv.length + body.length));
  out.set([0x44, 0x44, 0x57, 0x31], 0);
  out.set(iv, 4);
  out.set(body, 4 + iv.length);
  return out;
}

function expectPngOnly(requested: string[]) {
  expect(requested).toEqual([
    "https://cdn.example/v1/png/domdoc_png.js",
    "https://cdn.example/v1/png/domdoc_png_bg.wasm",
  ]);
  expect(requested.some((url) => /svg|pdf|docx|pdfium|jpeg|gif|webp|xlsx|ticket=/i.test(url))).toBe(false);
}

async function openPng(wasm: Uint8Array<ArrayBuffer>) {
  const requested: string[] = [];
  let module: Uint8Array | undefined;
  const load: GlueLoader = async (url) => {
    requested.push(url);
    const format = url.split("/").at(-2) ?? "png";
    return {
      default: async (arg?: unknown) => {
        module = (arg as { module_or_path?: Uint8Array } | undefined)?.module_or_path;
      },
      format: () => format,
      open: () => session(format),
    };
  };
  vi.stubGlobal("fetch", async (url: string) => {
    requested.push(String(url));
    return new Response(wasm);
  });
  const importers = bundlesFromCdn("https://cdn.example/v1", { load });
  try {
    const loader = new BundleLoader(importers);
    const doc = await openDocument(loader, PNG, { name: "photo.png" });
    return { doc, requested, module, notice: bundleLoadNotice(importers) };
  } finally {
    vi.unstubAllGlobals();
  }
}
