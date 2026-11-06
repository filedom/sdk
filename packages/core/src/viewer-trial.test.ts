// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { bundlesFromCdn, type GlueLoader } from "./cdn.js";
import type { EngineSession } from "./engine-types.js";
import { FiledomViewer } from "./viewer.js";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WASM = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);

function session(exportExtension = "png"): EngineSession {
  const info = JSON.stringify({
    format: "png",
    pageCount: 1,
    trackChanges: false,
    author: "",
    pendingRevisions: 0,
    exportExtension,
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

function load(exportExtension = "png"): GlueLoader {
  return async (url) => {
    const format = url.split("/").at(-2) ?? "png";
    return {
      default: async () => {},
      format: () => format,
      open: () => session(exportExtension),
    };
  };
}

async function openViewer(license: "trial" | "licensed", exportExtension = "png", toolbar = false) {
  const opens: string[] = [];
  const bodies: string[] = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const target = String(url);
    if (target.endsWith("/open")) {
      opens.push(target);
      bodies.push(String(init?.body));
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("omit");
      expect(new Headers(init?.headers).get("x-filedom-device")).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(String(init?.body)).toBe(JSON.stringify({ extension: "png" }));
      expect(new Headers(init?.headers).get("x-filedom-license-key")).toBe(
        license === "licensed" ? "ddk-customer" : null,
      );
      return new Response(JSON.stringify({ trial: license === "trial" }), {
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(WASM);
  });
  const root = document.createElement("div");
  document.body.append(root);
  const stored: string[] = [];
  const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation((key: string, value: string) => {
    stored.push(`${key}=${value}`);
  });
  const viewer = new FiledomViewer(root, {
    bundles: bundlesFromCdn("https://cdn.example/v1", { load: load(exportExtension) }),
    toolbar,
    apiBase: "https://api.example/api",
    licenseKey: license === "licensed" ? "ddk-customer" : undefined,
  });
  await viewer.open(PNG, { name: "photo.png" });
  expect(opens).toEqual(["https://api.example/api/open"]);
  expect(bodies[0]).toBe(JSON.stringify({ extension: "png" }));
  return { root, viewer, setItem, stored, bodies };
}

describe("trial banner", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it("opens a trial response without a trial banner and still renders", async () => {
    const { root, viewer, setItem, stored } = await openViewer("trial");
    const banner = root.querySelector(".dd-trial");
    expect(banner?.textContent).toBe("");
    expect(banner?.hasAttribute("hidden")).toBe(true);
    expect(root.textContent).not.toContain("Trial: unlicensed filedom");
    expect(root.querySelector(".dd-page")).toBeTruthy();
    expect(stored.join("\n")).not.toContain("Trial: unlicensed filedom");
    expect(setItem.mock.calls.some((call) => String(call[1]).includes("Trial: unlicensed filedom"))).toBe(false);
    viewer.destroy();
  });

  it("records a conversion when the written extension differs", async () => {
    const { viewer, bodies } = await openViewer("licensed", "docx");
    await viewer.exportFile();
    await vi.waitFor(() => {
      expect(bodies).toContain(JSON.stringify({ extension: "docx", operation: "convert" }));
    });
    viewer.destroy();
  });

  it("does not record a conversion when the export keeps the extension", async () => {
    const { viewer, bodies } = await openViewer("licensed");
    await viewer.exportFile();
    expect(bodies).toEqual([JSON.stringify({ extension: "png" })]);
    viewer.destroy();
  });

  it("does not show the trial banner for a licensed response and still renders", async () => {
    const { root, viewer } = await openViewer("licensed");
    const banner = root.querySelector(".dd-trial");
    expect(banner?.hasAttribute("hidden")).toBe(true);
    expect(banner?.textContent).toBe("");
    expect(root.textContent).not.toContain("Trial: unlicensed filedom");
    expect(root.querySelector(".dd-page")).toBeTruthy();
    viewer.destroy();
  });

  it("keeps a second open file as a tab", async () => {
    const { root, viewer } = await openViewer("licensed", "png", true);
    await viewer.open(PNG, { name: "scan.png" });
    await vi.waitFor(() => {
      expect(root.querySelectorAll(".dd-tab")).toHaveLength(2);
    });
    const tabs = [...root.querySelectorAll(".dd-tab")];
    expect(tabs.map((tab) => tab.querySelector(".dd-file-name")?.textContent)).toEqual(["scan.png", "photo.png"]);
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(tabs[0]?.querySelector(".dd-file-icon svg")?.getAttribute("data-icon")).toBe("image");
    expect(tabs[0]?.querySelector("[data-action='fullscreen']")).toBeTruthy();
    expect(tabs[0]?.querySelector("[data-action='close-file']")).toBeTruthy();
    expect(root.querySelector(".dd-file-actions")).toBeNull();
    (tabs[1] as HTMLElement).click();
    expect(root.querySelector(".dd-tab[aria-selected='true'] .dd-file-name")?.textContent).toBe("photo.png");
    expect(root.querySelector(".dd-page")).toBeTruthy();
    viewer.destroy();
  });
});
