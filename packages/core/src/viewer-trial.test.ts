// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { bundlesFromCdn, type GlueLoader } from "./cdn.js";
import type { EngineSession } from "./engine-types.js";
import { DomdocViewer } from "./viewer.js";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WASM = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);

function session(): EngineSession {
  const info = JSON.stringify({
    format: "png",
    pageCount: 1,
    trackChanges: false,
    author: "",
    pendingRevisions: 0,
    exportExtension: "png",
    exportMime: "image/png",
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
  });
  const page = JSON.stringify({
    index: 0,
    widthPt: 200,
    heightPt: 200,
    content: { xPt: 0, yPt: 0, widthPt: 200, heightPt: 200 },
    rasterized: false,
    runs: [],
    highlights: [],
    embeds: [],
  });
  return {
    info: () => info,
    page: () => page,
    raster: () => undefined,
    unitText: () => "",
    span: () => JSON.stringify({ ranges: [] }),
    locate: () => "null",
    apply: () => "{}",
    handle: () => "[]",
    attach: () => {},
    loadFontMetrics: () => {},
    loadFontFace: () => {},
    setReadOnly: () => {},
    selection: () => "null",
    setEmbeds: () => {},
    embedBoxes: () => "[]",
    revisions: () => "[]",
    search: () => "[]",
    export: () => new Uint8Array(),
    free: () => {},
  };
}

function load(): GlueLoader {
  return async (url) => {
    const format = url.split("/").at(-2) ?? "png";
    return {
      default: async () => {},
      format: () => format,
      open: () => session(),
    };
  };
}

async function openViewer(license: "trial" | "licensed") {
  vi.stubGlobal("fetch", async () => {
    return new Response(WASM, { headers: { "x-domdoc-license": license, "cache-control": "no-store" } });
  });
  const root = document.createElement("div");
  document.body.append(root);
  const stored: string[] = [];
  const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation((key: string, value: string) => {
    stored.push(`${key}=${value}`);
  });
  const viewer = new DomdocViewer(root, {
    bundles: bundlesFromCdn("https://cdn.example/v1", { load: load(), ticket: "ticket-1" }),
    toolbar: false,
  });
  await viewer.open(PNG, { name: "photo.png" });
  return { root, viewer, setItem, stored };
}

describe("trial banner", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it("shows Trial: unlicensed domdoc for a trial response and still renders", async () => {
    const { root, viewer, setItem, stored } = await openViewer("trial");
    const banner = root.querySelector(".dd-trial");
    expect(banner?.textContent).toBe("Trial: unlicensed domdoc");
    expect(banner?.hasAttribute("hidden")).toBe(false);
    expect(root.querySelector(".dd-page")).toBeTruthy();
    expect(stored.join("\n")).not.toContain("Trial: unlicensed domdoc");
    expect(setItem.mock.calls.some((call) => String(call[1]).includes("Trial: unlicensed domdoc"))).toBe(false);
    viewer.destroy();
  });

  it("does not show the trial banner for a licensed response and still renders", async () => {
    const { root, viewer } = await openViewer("licensed");
    const banner = root.querySelector(".dd-trial");
    expect(banner?.hasAttribute("hidden")).toBe(true);
    expect(banner?.textContent).toBe("");
    expect(root.textContent).not.toContain("Trial: unlicensed domdoc");
    expect(root.querySelector(".dd-page")).toBeTruthy();
    viewer.destroy();
  });
});
