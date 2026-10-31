// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { elementFactory } from "./dom.js";
import {
  LayerElementsCache,
  LayersPanel,
  elementListName,
  layerElementsForPage,
  layerElementsKey,
  paintElementThumb,
  type LayerElementItem,
} from "./layers.js";

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function item(partial: Partial<LayerElementItem> & Pick<LayerElementItem, "id">): LayerElementItem {
  return {
    page: 0,
    kind: "image",
    name: "Image",
    layerId: "layer0",
    box: { xPt: 10, yPt: 20, widthPt: 40, heightPt: 30 },
    pageWidthPt: 200,
    ...partial,
  };
}

function mock2d() {
  return {
    fillStyle: "",
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([255, 10, 10, 255]) })),
  };
}

function sourceCanvas(): HTMLCanvasElement {
  const source = document.createElement("canvas");
  source.width = 200;
  source.height = 100;
  return source;
}

function stubObserver(mode: "immediate" | "silent"): void {
  class StubObserver {
    constructor(private readonly callback: IntersectionObserverCallback) {}
    observe(target: Element): void {
      if (mode === "silent") return;
      this.callback(
        [
          {
            isIntersecting: true,
            target,
            intersectionRatio: 1,
            time: 0,
            boundingClientRect: target.getBoundingClientRect(),
            intersectionRect: target.getBoundingClientRect(),
            rootBounds: null,
          } as IntersectionObserverEntry,
        ],
        this as unknown as IntersectionObserver,
      );
    }
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
    root = null;
    rootMargin = "";
    thresholds = [];
  }
  vi.stubGlobal("IntersectionObserver", StubObserver);
}

describe("elementListName", () => {
  it("names text from content and other kinds by type", () => {
    expect(elementListName("text", "Hello world")).toBe("Hello world");
    expect(elementListName("text", "")).toBe("Text");
    expect(elementListName("image")).toBe("Image");
    expect(elementListName("path")).toBe("Shape");
  });
});

describe("layerElementsKey / LayerElementsCache", () => {
  it("reuses the built array while the key is unchanged", () => {
    const cache = new LayerElementsCache();
    const key = layerElementsKey(3, 12, "layer0");
    expect(key).toBe("3\t12\tlayer0");
    const build = vi.fn(() => [
      layerElementsForPage(
        0,
        200,
        [{ id: "p0o0", kind: "image", text: "", box: { xPt: 0, yPt: 0, widthPt: 10, heightPt: 10 } }],
        [{ id: "p0o0", layerId: "L1" }],
        "layer0",
      )[0]!,
    ]);
    const first = cache.get(key, build);
    const second = cache.get(key, build);
    expect(build).toHaveBeenCalledOnce();
    expect(second).toBe(first);
    expect(first[0]!.layerId).toBe("L1");

    const next = cache.get(layerElementsKey(4, 12, "layer0"), build);
    expect(build).toHaveBeenCalledTimes(2);
    expect(next).not.toBe(first);
  });
});

describe("paintElementThumb", () => {
  it("draws an isolated crop of the page canvas", () => {
    const source = sourceCanvas();
    const thumb = document.createElement("canvas");
    document.body.append(thumb);
    const ctx = mock2d();
    vi.spyOn(thumb, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);

    paintElementThumb(thumb, source, { xPt: 10, yPt: 20, widthPt: 40, heightPt: 30 }, 200);

    expect(thumb.width).toBeGreaterThan(0);
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.drawImage).toHaveBeenCalledWith(source, 10, 20, 40, 30, expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number));
    const sample = thumb.getContext("2d")!.getImageData(thumb.width / 2, thumb.height / 2, 1, 1).data;
    expect(sample[0]).toBeGreaterThan(200);
    expect(sample[1]).toBeLessThan(40);
  });
});

describe("LayersPanel", () => {
  const h = () => elementFactory(document);

  it("lists every element under a layer with name and id", () => {
    const selectElement = vi.fn();
    const panel = new LayersPanel(h(), {
      setLayer: vi.fn(),
      selectElement,
    });
    document.body.append(panel.el);
    panel.render(
      [{ id: "layer0", name: "Page", visible: true, locked: false }],
      [
        item({ id: "p0o0", name: "Image", kind: "image" }),
        item({ id: "u1", name: "Hello", kind: "text", layerId: "layer0" }),
      ],
      "p0o0",
      () => undefined,
    );

    const rows = [...panel.el.querySelectorAll<HTMLElement>(".dd-layer-element")];
    expect(rows).toHaveLength(2);
    expect(rows[0]!.dataset.elementId).toBe("p0o0");
    expect(rows[0]!.dataset.selected).toBe("");
    expect(rows[0]!.querySelector(".dd-layer-element-name")!.textContent).toBe("Image");
    expect(rows[0]!.querySelector(".dd-layer-element-id")!.textContent).toBe("p0o0");
    expect(rows[0]!.querySelector(".dd-layer-thumb")).toBeTruthy();
    expect(rows[0]!.querySelector("canvas.dd-layer-thumb")).toBeNull();
    expect(rows[1]!.querySelector(".dd-layer-element-name")!.textContent).toBe("Hello");

    rows[1]!.click();
    expect(selectElement).toHaveBeenCalledWith("u1", 0);
  });

  it("groups elements under one default layer when the file has none", () => {
    const panel = new LayersPanel(h(), {
      setLayer: vi.fn(),
      selectElement: vi.fn(),
    });
    document.body.append(panel.el);
    panel.render([], [item({ id: "p0o1", layerId: "layer0" })], undefined, () => undefined);

    expect(panel.el.querySelector(".dd-layer-heading")!.textContent).toBe("Layer 1");
    expect(panel.el.querySelectorAll(".dd-layer-element")).toHaveLength(1);
  });

  it("toggles visibility and lock on the layer header", () => {
    const setLayer = vi.fn();
    const panel = new LayersPanel(h(), {
      setLayer,
      selectElement: vi.fn(),
    });
    document.body.append(panel.el);
    panel.render(
      [{ id: "L1", name: "Background", visible: true, locked: false }],
      [],
      undefined,
      () => undefined,
    );

    panel.el.querySelector<HTMLButtonElement>('[data-action="toggle-visible"]')!.click();
    expect(setLayer).toHaveBeenCalledWith("L1", { visible: false });
    panel.el.querySelector<HTMLButtonElement>('[data-action="toggle-locked"]')!.click();
    expect(setLayer).toHaveBeenCalledWith("L1", { locked: true });
  });

  it("hides the tray from the heading control", () => {
    const hideTray = vi.fn();
    const panel = new LayersPanel(h(), {
      setLayer: vi.fn(),
      selectElement: vi.fn(),
      hideTray,
    });
    document.body.append(panel.el);
    panel.render([{ id: "L1", name: "Background", visible: true, locked: false }], [], undefined, () => undefined);
    panel.el.querySelector<HTMLButtonElement>('[data-action="hide-tray"]')!.click();
    expect(hideTray).toHaveBeenCalledOnce();
  });

  it("does not create a canvas per row until paint", () => {
    stubObserver("silent");
    const panel = new LayersPanel(h(), {
      setLayer: vi.fn(),
      selectElement: vi.fn(),
    });
    // Zero-size panel: geometry fallback finds no intersecting rows.
    panel.el.style.width = "0";
    panel.el.style.height = "0";
    panel.el.style.overflow = "hidden";
    document.body.append(panel.el);

    const many = Array.from({ length: 80 }, (_, i) => item({ id: `p0o${i}`, name: `Item ${i}` }));
    const source = sourceCanvas();
    panel.render([{ id: "layer0", name: "Layer 1", visible: true, locked: false }], many, undefined, () => source);

    expect(panel.el.querySelectorAll(".dd-layer-element")).toHaveLength(80);
    expect(panel.el.querySelectorAll("canvas.dd-layer-thumb")).toHaveLength(0);
    expect(panel.el.querySelectorAll("span.dd-layer-thumb")).toHaveLength(80);

    panel.refreshThumbs(() => source);
    expect(panel.el.querySelectorAll("canvas.dd-layer-thumb")).toHaveLength(0);
  });

  it("creates canvases only for painted visible rows", () => {
    stubObserver("immediate");
    const panel = new LayersPanel(h(), {
      setLayer: vi.fn(),
      selectElement: vi.fn(),
    });
    document.body.append(panel.el);

    const elements = [item({ id: "p0a" }), item({ id: "p0b" })];
    const source = sourceCanvas();
    panel.render([{ id: "layer0", name: "Layer 1", visible: true, locked: false }], elements, undefined, () => source);

    const canvases = panel.el.querySelectorAll("canvas.dd-layer-thumb");
    expect(canvases.length).toBeGreaterThan(0);
    expect(canvases.length).toBeLessThanOrEqual(elements.length);
    expect(panel.el.querySelectorAll("span.dd-layer-thumb").length + canvases.length).toBe(elements.length);
  });

  it("refreshThumbs re-crops only visible rows for the painted page", () => {
    stubObserver("immediate");
    const panel = new LayersPanel(h(), {
      setLayer: vi.fn(),
      selectElement: vi.fn(),
    });
    document.body.append(panel.el);

    const elements = [
      item({ id: "p0a", page: 0 }),
      item({ id: "p0b", page: 0 }),
      item({ id: "p1a", page: 1 }),
    ];
    const source0 = sourceCanvas();
    const source1 = sourceCanvas();
    const pageCanvas = (page: number) => (page === 0 ? source0 : source1);

    panel.render([{ id: "layer0", name: "Layer 1", visible: true, locked: false }], elements, undefined, pageCanvas);

    const ctxById = new Map<string, ReturnType<typeof mock2d>>();
    for (const row of panel.el.querySelectorAll<HTMLElement>(".dd-layer-element")) {
      const id = row.dataset.elementId!;
      const thumb = row.querySelector<HTMLCanvasElement>("canvas.dd-layer-thumb")!;
      const ctx = mock2d();
      ctxById.set(id, ctx);
      vi.spyOn(thumb, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    }

    // Invalidate only page 0 — page 1 thumb must stay untouched.
    panel.refreshThumbs(pageCanvas, [0]);

    expect(ctxById.get("p0a")!.drawImage).toHaveBeenCalled();
    expect(ctxById.get("p0b")!.drawImage).toHaveBeenCalled();
    expect(ctxById.get("p1a")!.drawImage).not.toHaveBeenCalled();
  });

  it("refreshThumbs re-crops after the page canvas gains pixels", () => {
    stubObserver("immediate");
    const panel = new LayersPanel(h(), {
      setLayer: vi.fn(),
      selectElement: vi.fn(),
    });
    document.body.append(panel.el);
    panel.render(
      [{ id: "layer0", name: "Layer 1", visible: true, locked: false }],
      [item({ id: "p0o0" })],
      undefined,
      () => undefined,
    );

    const source = sourceCanvas();
    const thumb = panel.el.querySelector<HTMLCanvasElement>("canvas.dd-layer-thumb")!;
    const ctx = mock2d();
    vi.spyOn(thumb, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);

    panel.refreshThumbs(() => source);

    expect(ctx.drawImage).toHaveBeenCalled();
  });

  it("updates selection without rebuilding the list", () => {
    const panel = new LayersPanel(h(), {
      setLayer: vi.fn(),
      selectElement: vi.fn(),
    });
    document.body.append(panel.el);
    const elements = [item({ id: "a" }), item({ id: "b" })];
    panel.render([{ id: "layer0", name: "Layer 1", visible: true, locked: false }], elements, "a", () => undefined);
    const firstRow = panel.el.querySelector(".dd-layer-element")!;
    panel.render([{ id: "layer0", name: "Layer 1", visible: true, locked: false }], elements, "b", () => undefined);
    expect(panel.el.querySelector(".dd-layer-element")).toBe(firstRow);
    expect(panel.el.querySelector<HTMLElement>('[data-element-id="b"]')!.dataset.selected).toBe("");
    expect(panel.el.querySelector<HTMLElement>('[data-element-id="a"]')!.dataset.selected).toBeUndefined();
  });
});
