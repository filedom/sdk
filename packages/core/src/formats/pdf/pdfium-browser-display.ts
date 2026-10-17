/** Browser PDF display via Emscripten glue (separate heap from domdoc_engine). */

export interface PdfiumBrowserAssets {
  /** URL to domdoc_pdfium.js factory module. */
  glueModuleUrl: string;
  /** Resolves sibling .wasm path. */
  locateFile: (file: string) => string;
}

export interface PdfPageBitmap {
  width: number;
  height: number;
  /** RGBA tightly packed (converted from BGRA). */
  rgba: Uint8ClampedArray;
}

type EmscriptenModule = {
  cwrap: (
    name: string,
    returnType: string | null,
    argTypes: string[],
  ) => (...args: number[]) => number;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
  HEAPU8: Uint8Array;
};

let cachedModule: EmscriptenModule | null = null;

async function loadModule(assets: PdfiumBrowserAssets): Promise<EmscriptenModule> {
  if (cachedModule) return cachedModule;
  const mod = await import(/* @vite-ignore */ assets.glueModuleUrl);
  const factory = mod.default as (opts: {
    locateFile: (name: string) => string;
  }) => Promise<EmscriptenModule>;
  const instance = await factory({ locateFile: assets.locateFile });
  const pdfiumInit = (instance as unknown as { _PDFium_Init?: () => void })._PDFium_Init;
  if (typeof pdfiumInit === "function") {
    pdfiumInit();
  } else {
    instance.cwrap("FPDF_InitLibrary", null, [])();
  }
  cachedModule = instance;
  return instance;
}

function bgraToRgba(bgra: Uint8Array, width: number, height: number, stride: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = y * stride + x * 4;
      const dst = (y * width + x) * 4;
      rgba[dst] = bgra[src + 2]!;
      rgba[dst + 1] = bgra[src + 1]!;
      rgba[dst + 2] = bgra[src]!;
      rgba[dst + 3] = 255;
    }
  }
  return rgba;
}

/** Render one PDF page to RGBA using PDFium in the browser. */
export async function renderPdfPageBitmapBrowser(
  pdfBytes: Uint8Array,
  pageIndex: number,
  scale: number,
  assets: PdfiumBrowserAssets,
): Promise<PdfPageBitmap> {
  const Module = await loadModule(assets);
  const cwrap = Module.cwrap.bind(Module);
  const LoadMem = cwrap("FPDF_LoadMemDocument", "number", ["number", "number", "number"]);
  const GetPageCount = cwrap("FPDF_GetPageCount", "number", ["number"]);
  const LoadPage = cwrap("FPDF_LoadPage", "number", ["number", "number"]);
  const GetPageWidth = cwrap("FPDF_GetPageWidthF", "number", ["number"]);
  const GetPageHeight = cwrap("FPDF_GetPageHeightF", "number", ["number"]);
  const CreateBitmap = cwrap("FPDFBitmap_Create", "number", ["number", "number", "number"]);
  const RenderPageBitmap = cwrap("FPDF_RenderPageBitmap", null, [
    "number",
    "number",
    "number",
    "number",
    "number",
    "number",
    "number",
    "number",
  ]);
  const GetStride = cwrap("FPDFBitmap_GetStride", "number", ["number"]);
  const GetBuffer = cwrap("FPDFBitmap_GetBuffer", "number", ["number"]);
  const GetHeight = cwrap("FPDFBitmap_GetHeight", "number", ["number"]);
  const DestroyBitmap = cwrap("FPDFBitmap_Destroy", null, ["number"]);
  const ClosePage = cwrap("FPDF_ClosePage", null, ["number"]);
  const CloseDoc = cwrap("FPDF_CloseDocument", null, ["number"]);

  const copy = Uint8Array.from(pdfBytes);
  const docPtr = Module._malloc(copy.byteLength);
  Module.HEAPU8.set(copy, docPtr);
  const doc = LoadMem(docPtr, copy.byteLength, 0);
  if (!doc) {
    Module._free(docPtr);
    throw new Error("FPDF_LoadMemDocument failed");
  }

  try {
    const count = GetPageCount(doc);
    const index = Math.min(Math.max(0, pageIndex), Math.max(0, count - 1));
    const page = LoadPage(doc, index);
    if (!page) throw new Error(`FPDF_LoadPage failed index=${index}`);
    try {
      const width = Math.max(1, Math.ceil(GetPageWidth(page) * scale));
      const height = Math.max(1, Math.ceil(GetPageHeight(page) * scale));
      const bitmap = CreateBitmap(width, height, 3);
      if (!bitmap) throw new Error("FPDFBitmap_Create failed");
      try {
        RenderPageBitmap(bitmap, page, 0, 0, width, height, 0, 0);
        const stride = GetStride(bitmap);
        const bmpHeight = GetHeight(bitmap);
        const bufferPtr = GetBuffer(bitmap);
        const bgra = Module.HEAPU8.slice(bufferPtr, bufferPtr + stride * bmpHeight);
        const rgba = bgraToRgba(bgra, width, bmpHeight, stride);
        return { width, height: bmpHeight, rgba };
      } finally {
        DestroyBitmap(bitmap);
      }
    } finally {
      ClosePage(page);
    }
  } finally {
    CloseDoc(doc);
    Module._free(docPtr);
  }
}
