import { createCipheriv, createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { BundleLoader } from "./bundles.js";
import { bundleUrl, bundlesFromCdn, type GlueLoader } from "./cdn.js";
import type { EngineSession } from "./engine-types.js";
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
    for (const format of ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "png", "jpeg", "gif", "webp", "svg", "ai"] as const) {
      expect(bundleUrl(`${base}/`, format)).toBe(`${base}/${format}/domdoc_${format}.js`);
    }
    expect(bundleUrl(base, "docx")).not.toContain("office");
    expect(Object.keys(bundlesFromCdn(base)).sort()).toEqual([
      "ai",
      "doc",
      "docx",
      "gif",
      "jpeg",
      "pdf",
      "png",
      "ppt",
      "pptx",
      "svg",
      "webp",
      "xls",
      "xlsx",
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

    const loader = new BundleLoader(bundlesFromCdn("https://cdn.example/v1", load));
    const first = await openDocument(loader, PNG, { name: "photo.png" });
    const second = await openDocument(loader, PNG, { name: "other.png" });
    expect(first.format).toBe("png");
    expect(second.format).toBe("png");
    expect(requested).toEqual(["https://cdn.example/v1/png/domdoc_png.js"]);
    expect(requested.some((url) => /svg|pdf|docx|pdfium/i.test(url))).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    first.dispose();
    second.dispose();
    vi.unstubAllGlobals();
  });

  it("fetches pdfium.wasm only when the PDF module initializes", async () => {
    const requested: string[] = [];
    const load: GlueLoader = async (url) => {
      requested.push(url);
      return {
        default: async () => {},
        open: () => session("pdf"),
      };
    };
    vi.stubGlobal("fetch", async (url: string) => {
      requested.push(String(url));
      return new Response(new Uint8Array([0, 97, 115, 109]));
    });
    const loader = new BundleLoader(bundlesFromCdn("https://cdn.example/v1", load));
    await expect(openDocument(loader, PDF, { name: "notes.pdf" })).rejects.toThrow(/initialize_pdfium_render/);
    expect(requested).toContain("https://cdn.example/v1/pdf/domdoc_pdf.js");
    expect(requested).toContain("https://cdn.example/v1/pdf/pdfium.wasm");
    expect(requested.some((url) => url.includes("/png/") || url.includes("/docx/") || url.includes("/svg/"))).toBe(false);
    vi.unstubAllGlobals();
  });

  it("passes plain wasm bytes through when a content key is set", async () => {
    const plain = wasmBytes();
    const opened = await openPng(plain, { key: contentKey() });
    expect(Array.from(opened.module!)).toEqual(Array.from(plain));
    expect(Array.from(opened.module!.subarray(0, 4))).toEqual([0x00, 0x61, 0x73, 0x6d]);
    expectPngOnly(opened.requested);
    opened.doc.dispose();
  });

  it("decrypts sealed wasm with the content key and does not request other formats", async () => {
    const plain = wasmBytes();
    const key = contentKey();
    const sealed = await sealWasm(plain, key);
    expect(String.fromCharCode(sealed[0]!, sealed[1]!, sealed[2]!, sealed[3]!)).toBe("DDW1");
    const opened = await openPng(sealed, { key });
    expect(Array.from(opened.module!)).toEqual(Array.from(plain));
    expectPngOnly(opened.requested);
    opened.doc.dispose();
  });

  it("decrypts sealed wasm with the API wrappedContentKey", async () => {
    const plain = wasmBytes();
    const key = contentKey();
    const ticket = "eyJndWVzdCI6dHJ1ZSwiZXhwIjoxfQ.sig";
    const opened = await openPng(await sealWasm(plain, key), {
      ticket: { ticket, wrappedContentKey: wrapContentKey(key, ticket) },
    });
    expect(Array.from(opened.module!)).toEqual(Array.from(plain));
    expectPngOnly(opened.requested);
    opened.doc.dispose();
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

/** Same wrap as `domdoc-api` `wrapContentKey`: base64(iv || ciphertext || tag), key = SHA-256(ticket). */
function wrapContentKey(key: Uint8Array<ArrayBuffer>, ticket: string): string {
  const aesKey = createHash("sha256").update(ticket).digest();
  const iv = Buffer.alloc(12, 4);
  const cipher = createCipheriv("aes-256-gcm", aesKey, iv);
  const enc = Buffer.concat([cipher.update(key), cipher.final()]);
  return Buffer.concat([iv, enc, cipher.getAuthTag()]).toString("base64");
}

function expectPngOnly(requested: string[]) {
  expect(requested).toEqual([
    "https://cdn.example/v1/png/domdoc_png.js",
    "https://cdn.example/v1/png/domdoc_png_bg.wasm",
  ]);
  expect(requested.some((url) => /svg|pdf|docx|pdfium|jpeg|gif|webp|xlsx/i.test(url))).toBe(false);
}

async function openPng(
  wasm: Uint8Array<ArrayBuffer>,
  options: { key?: Uint8Array<ArrayBuffer>; ticket?: { ticket: string; wrappedContentKey: string } },
) {
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
  try {
    const loader = new BundleLoader(bundlesFromCdn("https://cdn.example/v1", { load, ...options }));
    const doc = await openDocument(loader, PNG, { name: "photo.png" });
    return { doc, requested, module };
  } finally {
    vi.unstubAllGlobals();
  }
}
