import { button, type ElementFactory } from "./dom.js";
import type { LayerView, Rect } from "./engine-types.js";

export interface LayerActions {
  /** Visibility and lock patches; omitted fields stay unchanged. */
  setLayer(id: string, patch: { visible?: boolean; locked?: boolean }): void;
  /** Select one element on the page. */
  selectElement(id: string, page: number): void;
  /** Hide this tray until the View menu shows it again. */
  hideTray?(): void;
}

/** One selectable entry under a layer. */
export interface LayerElementItem {
  id: string;
  page: number;
  kind: string;
  /** Short label shown beside the id. */
  name: string;
  layerId: string;
  box: Rect;
  pageWidthPt: number;
}

const DEFAULT_LAYER: LayerView = {
  id: "layer0",
  name: "Layer 1",
  visible: true,
  locked: false,
};

const THUMB = 40;

/** Display name for a layer list row. */
export function elementListName(kind: string, text = ""): string {
  if (kind === "text") {
    const clipped = text.replace(/\s+/g, " ").trim();
    if (!clipped) return "Text";
    return clipped.length > 36 ? `${clipped.slice(0, 35)}…` : clipped;
  }
  if (kind === "image") return "Image";
  if (kind === "path") return "Shape";
  if (kind === "form") return "Group";
  if (kind === "shading") return "Shading";
  return "Element";
}

/**
 * Cache key for layer element rows. Changes when the document revision, page
 * count, or default layer id changes — not on selection or zoom chrome.
 */
export function layerElementsKey(revision: number, pageCount: number, fallbackLayerId: string): string {
  return `${revision}\t${pageCount}\t${fallbackLayerId}`;
}

/** Maps one page's selectable elements into tray rows. */
export function layerElementsForPage(
  page: number,
  pageWidthPt: number,
  elements: Array<{ id: string; kind: string; text: string; box: Rect }>,
  objects: Array<{ id: string; layerId?: string }>,
  fallbackLayerId: string,
): LayerElementItem[] {
  const objectById = new Map(objects.map((item) => [item.id, item]));
  return elements.map((element) => ({
    id: element.id,
    page,
    kind: element.kind,
    name: elementListName(element.kind, element.text),
    layerId: objectById.get(element.id)?.layerId || fallbackLayerId,
    box: element.box,
    pageWidthPt,
  }));
}

/** Reuses a built `LayerElementItem[]` while `layerElementsKey` is unchanged. */
export class LayerElementsCache {
  private key = "";
  private elements: LayerElementItem[] = [];

  get(key: string, build: () => LayerElementItem[]): LayerElementItem[] {
    if (key === this.key) return this.elements;
    this.key = key;
    this.elements = build();
    return this.elements;
  }

  clear(): void {
    this.key = "";
    this.elements = [];
  }
}

/** Crops the page canvas into an isolated thumbnail of `box`. */
export function paintElementThumb(
  thumb: HTMLCanvasElement,
  source: HTMLCanvasElement,
  box: Rect,
  pageWidthPt: number,
): void {
  const scale = pageWidthPt > 0 ? source.width / pageWidthPt : 1;
  const sx = Math.max(0, Math.floor(box.xPt * scale));
  const sy = Math.max(0, Math.floor(box.yPt * scale));
  const sw = Math.max(1, Math.ceil(box.widthPt * scale));
  const sh = Math.max(1, Math.ceil(box.heightPt * scale));
  const dpr = thumb.ownerDocument.defaultView?.devicePixelRatio || 1;
  const size = Math.round(THUMB * dpr);
  thumb.width = size;
  thumb.height = size;
  thumb.style.width = `${THUMB}px`;
  thumb.style.height = `${THUMB}px`;
  const ctx = thumb.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  const fit = Math.min(size / sw, size / sh);
  const dw = Math.max(1, Math.floor(sw * fit));
  const dh = Math.max(1, Math.floor(sh * fit));
  const dx = Math.floor((size - dw) / 2);
  const dy = Math.floor((size - dh) / 2);
  try {
    ctx.drawImage(source, sx, sy, Math.min(sw, source.width - sx), Math.min(sh, source.height - sy), dx, dy, dw, dh);
  } catch {
    /* Offline canvases stay blank. */
  }
}

/**
 * Layers panel. Every page element appears under a layer. Files without layers
 * use one default layer. Selecting a row picks that element on the page; the
 * viewer then centers the page on it.
 * Thumbnails are painted lazily for rows that intersect the panel viewport.
 */
export class LayersPanel {
  readonly el: HTMLElement;
  private rendered = "";
  private layersKey = "";
  private lastElements: LayerElementItem[] = [];
  private byId = new Map<string, LayerElementItem>();
  private pageCanvas?: (page: number) => HTMLCanvasElement | undefined;
  private observer?: IntersectionObserver;
  private readonly visible = new Set<string>();
  private readonly painted = new Set<string>();
  private selectedId: string | undefined;

  constructor(
    private readonly h: ElementFactory,
    private readonly actions: LayerActions,
  ) {
    this.el = h("aside", "dd-panel dd-layers");
    this.el.setAttribute("aria-label", "Layers");
  }

  /** Drops rows and observer state so the next open can defer population. */
  clear(): void {
    this.rendered = "";
    this.layersKey = "";
    this.lastElements = [];
    this.byId = new Map();
    this.pageCanvas = undefined;
    this.selectedId = undefined;
    this.visible.clear();
    this.painted.clear();
    this.teardownObserver();
    this.el.replaceChildren();
  }

  /**
   * `pageCanvas` supplies the painted page for thumbnails. Layers default to one
   * named "Layer 1" when the file has none. Rows list immediately; thumbs wait
   * until the row is visible in this panel.
   */
  render(
    layers: LayerView[],
    elements: LayerElementItem[],
    selectedId: string | undefined,
    pageCanvas: (page: number) => HTMLCanvasElement | undefined,
  ): void {
    this.pageCanvas = pageCanvas;
    const listed = layers.length ? layers : [DEFAULT_LAYER];
    const layersKey = listed
      .map((layer) => `${layer.id}\t${layer.name}\t${layer.visible}\t${!!layer.locked}`)
      .join("\n");
    // Same array reference + unchanged layer headers → selection-only; skip O(n) key rebuild.
    if (elements === this.lastElements && layersKey === this.layersKey && this.el.childElementCount) {
      this.syncSelection(selectedId);
      return;
    }
    const fallback = listed[0]!.id;
    const key = [
      layersKey,
      elements.map((item) => `${item.id}\t${item.layerId}\t${item.name}`).join("\n"),
    ].join("\n---\n");
    if (key === this.rendered && this.el.childElementCount) {
      this.lastElements = elements;
      this.layersKey = layersKey;
      this.byId = new Map(elements.map((item) => [item.id, item]));
      this.syncSelection(selectedId);
      return;
    }
    this.lastElements = elements;
    this.layersKey = layersKey;
    this.byId = new Map(elements.map((item) => [item.id, item]));
    this.selectedId = selectedId;
    this.rendered = key;
    this.visible.clear();
    this.painted.clear();
    this.teardownObserver();

    const groups: HTMLElement[] = [this.heading()];
    for (const layer of listed) {
      const group = this.h("section", "dd-layer-group");
      group.dataset.layerId = layer.id;
      group.append(this.layerHeader(layer));
      const mine = elements.filter((item) => (item.layerId || fallback) === layer.id);
      if (!mine.length) {
        const empty = this.h("p", "dd-muted");
        empty.textContent = "No elements";
        group.append(empty);
      } else {
        for (const item of mine) group.append(this.elementRow(item, selectedId));
      }
      groups.push(group);
    }
    const orphaned = elements.filter((item) => !listed.some((layer) => layer.id === (item.layerId || fallback)));
    if (orphaned.length) {
      const group = this.h("section", "dd-layer-group");
      group.dataset.layerId = fallback;
      const title = this.h("h4", "dd-layer-heading");
      title.textContent = listed[0]?.name || "Layer 1";
      group.append(title);
      for (const item of orphaned) group.append(this.elementRow(item, selectedId));
      groups.push(group);
    }
    this.el.replaceChildren(...groups);
    this.observeRows();
  }

  private heading(): HTMLElement {
    const row = this.h("div", "dd-panel-heading");
    const title = this.h("h3");
    title.textContent = "Layers";
    row.append(title);
    if (this.actions.hideTray) {
      const hide = button(this.h, "Hide", () => this.actions.hideTray?.(), "Hide layers", "x");
      hide.dataset.action = "hide-tray";
      row.append(hide);
    }
    return row;
  }

  /**
   * Re-crop thumbs after page canvases gain pixels. Only visible rows are
   * painted; pass `pages` to invalidate just those page indices.
   */
  refreshThumbs(
    pageCanvas: (page: number) => HTMLCanvasElement | undefined,
    pages?: Iterable<number>,
  ): void {
    if (!this.lastElements.length || !this.el.childElementCount) return;
    this.pageCanvas = pageCanvas;
    const pageSet = pages ? new Set(pages) : undefined;
    for (const item of this.lastElements) {
      if (pageSet && !pageSet.has(item.page)) continue;
      this.painted.delete(item.id);
    }
    this.paintVisible(pageSet);
  }

  private layerHeader(layer: LayerView): HTMLElement {
    const row = this.h("div", "dd-layer-row dd-layer-header");
    const name = this.h("h4", "dd-layer-heading");
    name.textContent = layer.name || layer.id;
    const visible = button(
      this.h,
      layer.visible ? "Hide" : "Show",
      () => this.actions.setLayer(layer.id, { visible: !layer.visible }),
      layer.visible ? "Hide layer" : "Show layer",
    );
    visible.dataset.action = "toggle-visible";
    const locked = button(
      this.h,
      layer.locked ? "Unlock" : "Lock",
      () => this.actions.setLayer(layer.id, { locked: !layer.locked }),
      layer.locked ? "Unlock layer" : "Lock layer",
    );
    locked.dataset.action = "toggle-locked";
    row.append(name, visible, locked);
    return row;
  }

  private elementRow(item: LayerElementItem, selectedId: string | undefined): HTMLElement {
    const row = this.h("button", "dd-layer-element");
    row.type = "button";
    row.dataset.elementId = item.id;
    row.dataset.page = String(item.page);
    row.dataset.kind = item.kind;
    if (item.id === selectedId) row.dataset.selected = "";
    row.setAttribute("aria-label", `${item.name} (${item.id})`);
    row.title = `${item.name}\n${item.id}`;
    row.addEventListener("click", () => this.actions.selectElement(item.id, item.page));

    // Placeholder until paintRow upgrades it to a canvas — avoids GPU canvases for off-screen rows.
    const thumb = this.h("span", "dd-layer-thumb");
    thumb.setAttribute("aria-hidden", "true");

    const meta = this.h("span", "dd-layer-meta");
    const name = this.h("span", "dd-layer-element-name");
    name.textContent = item.name;
    const id = this.h("span", "dd-layer-element-id");
    id.textContent = item.id;
    meta.append(name, id);
    row.append(thumb, meta);
    return row;
  }

  private syncSelection(selectedId: string | undefined): void {
    if (selectedId === this.selectedId) return;
    this.selectedId = selectedId;
    for (const row of this.el.querySelectorAll<HTMLElement>(".dd-layer-element")) {
      if (row.dataset.elementId === selectedId) row.dataset.selected = "";
      else delete row.dataset.selected;
    }
  }

  private observeRows(): void {
    this.ensureObserver();
    if (!this.observer) return;
    for (const row of this.el.querySelectorAll<HTMLElement>(".dd-layer-element")) {
      this.observer.observe(row);
    }
  }

  private ensureObserver(): void {
    if (this.observer) return;
    const IO = this.el.ownerDocument.defaultView?.IntersectionObserver;
    if (!IO) return;
    this.observer = new IO(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.elementId;
          if (!id) continue;
          if (entry.isIntersecting) {
            this.visible.add(id);
            this.paintRow(id);
          } else {
            this.visible.delete(id);
          }
        }
      },
      { root: this.el, rootMargin: "80px 0px", threshold: 0 },
    );
  }

  private teardownObserver(): void {
    this.observer?.disconnect();
    this.observer = undefined;
  }

  private paintVisible(pages?: Set<number>): void {
    if (this.visible.size) {
      for (const id of this.visible) {
        const item = this.byId.get(id);
        if (!item) continue;
        if (pages && !pages.has(item.page)) continue;
        this.paintRow(id);
      }
      return;
    }
    // No IntersectionObserver reports yet (or unavailable): only paint rows that
    // already intersect the panel box — never the full list.
    this.paintIntersectingGeometry(pages);
  }

  private paintIntersectingGeometry(pages?: Set<number>): void {
    const root = this.el.getBoundingClientRect();
    if (root.width < 1 && root.height < 1) return;
    for (const row of this.el.querySelectorAll<HTMLElement>(".dd-layer-element")) {
      const id = row.dataset.elementId;
      if (!id) continue;
      const item = this.byId.get(id);
      if (!item) continue;
      if (pages && !pages.has(item.page)) continue;
      const box = row.getBoundingClientRect();
      if (box.bottom < root.top || box.top > root.bottom) continue;
      this.visible.add(id);
      this.paintRow(id);
    }
  }

  private paintRow(id: string): void {
    if (this.painted.has(id)) return;
    const item = this.byId.get(id);
    const pageCanvas = this.pageCanvas;
    if (!item || !pageCanvas) return;
    const row = this.el.querySelector<HTMLElement>(`[data-element-id="${cssEscape(id)}"]`);
    if (!row) return;
    const slot = row.querySelector<HTMLElement>(".dd-layer-thumb");
    if (!slot) return;
    let thumb: HTMLCanvasElement;
    if (slot instanceof HTMLCanvasElement) {
      thumb = slot;
    } else {
      thumb = this.h("canvas", "dd-layer-thumb") as HTMLCanvasElement;
      thumb.setAttribute("aria-hidden", "true");
      slot.replaceWith(thumb);
    }
    const source = pageCanvas(item.page);
    if (!source || source.width < 1) return;
    paintElementThumb(thumb, source, item.box, item.pageWidthPt);
    this.painted.add(id);
  }
}

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);
  return value.replace(/"/g, '\\"');
}
