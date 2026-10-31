import type { DomdocDocument } from "./document.js";
import type { ElementFactory } from "./dom.js";
import type { Embed, EmbedBox, Rect } from "./engine-types.js";
import { DomdocError } from "./errors.js";
import type { FileStore } from "./file-store.js";
import type { PageSlot } from "./pages.js";
import { PX_PER_PT } from "./zoom.js";
import {
  ComponentRegistry,
  sizeBasis,
  toPoints,
  type ComponentHandle,
  type FlowMode,
  type Placement,
  type PlacementPosition,
} from "./components.js";

const MEASURE_EPSILON_PT = 0.5;
const DEFAULT_INLINE_PT = 120;
const DEFAULT_FLOAT_PT = 160;
const DEFAULT_HEIGHT_PT = 24;

interface Mounted {
  id: string;
  placement: Placement & { id: string };
  wrapper: HTMLDivElement;
  body: HTMLDivElement;
  handle: ComponentHandle;
  measured?: { widthPt: number; heightPt: number };
}

export interface ComponentHost {
  document(): DomdocDocument | undefined;
  /** The page element, sized to that page. */
  slot(page: number): PageSlot | undefined;
  h: ElementFactory;
  files: FileStore;
  registry: ComponentRegistry;
  zoom(): number;
}

const round = (n: number) => Math.round(n * 100) / 100;
let placementCounter = 0;

type FlowPosition = Extract<PlacementPosition, { mode: FlowMode }>;

const isFlowPosition = (position: PlacementPosition): position is FlowPosition =>
  position.mode === "block" || position.mode === "inline" || position.mode === "float";

/**
 * Places host components on pages and reserves their space in flow layouts.
 * Overlay modes (`page`, `anchor`) follow a page point. Flow modes (`block`, `inline`,
 * `float`) reflow text when the document supports it and fall back to anchors otherwise.
 */
export class ComponentLayer {
  private readonly mounted = new Map<string, Mounted>();
  private readonly observer?: ResizeObserver;
  private running = false;

  constructor(
    private readonly host: ComponentHost,
    /** Called when a component's content size changes outside of `layout`. */
    private readonly onResize: () => void,
  ) {
    const RO = host.h("div").ownerDocument.defaultView?.ResizeObserver;
    if (RO) {
      this.observer = new RO(() => {
        if (this.running) return;
        if (this.measure()) this.onResize();
      });
    }
  }

  mount<P>(placement: Placement<P>): string {
    const doc = this.host.document();
    if (!doc) throw new DomdocError("no-document", "open a document before placing components");
    const factory = this.host.registry.get(placement.type);
    if (!factory) throw new DomdocError("unknown-component", placement.type);
    const id = placement.id ?? `cmp-${++placementCounter}`;
    this.remove(id);
    const wrapper = this.host.h("div", "dd-component dd-abs");
    wrapper.dataset.componentId = id;
    wrapper.dataset.componentType = placement.type;
    if (placement.label) wrapper.setAttribute("aria-label", placement.label);
    const body = this.host.h("div", "dd-component-body");
    wrapper.append(body);
    const full = { ...placement, id } as Placement & { id: string };
    const result = factory({
      id,
      props: (placement.props ?? {}) as Record<string, unknown>,
      placement: full,
      files: this.host.files,
      document: doc,
      container: body,
    });
    const handle: ComponentHandle = result instanceof HTMLElement ? { element: result } : (result ?? {});
    if (handle.element && handle.element.parentElement !== body) body.append(handle.element);
    this.mounted.set(id, { id, placement: full, wrapper, body, handle });
    this.observer?.observe(body);
    return id;
  }

  update(id: string, patch: Partial<Placement>): void {
    const mounted = this.mounted.get(id);
    if (!mounted) return;
    mounted.placement = { ...mounted.placement, ...patch, id };
    if (patch.props) mounted.handle.update?.(patch.props);
  }

  remove(id: string): void {
    const mounted = this.mounted.get(id);
    if (!mounted) return;
    this.observer?.unobserve(mounted.body);
    mounted.handle.destroy?.();
    mounted.wrapper.remove();
    this.mounted.delete(id);
  }

  ids(): string[] {
    return [...this.mounted.keys()];
  }

  pageOf(id: string): number | undefined {
    const page = this.mounted.get(id)?.wrapper.closest<HTMLElement>("[data-page]")?.dataset.page;
    return page === undefined ? undefined : Number(page);
  }

  clear(): void {
    for (const id of [...this.mounted.keys()]) this.remove(id);
    const doc = this.host.document();
    if (doc?.info().capabilities.flowEmbeds) doc.setEmbeds([]);
  }

  /**
   * Reserves flow space, then positions every component. Measuring auto sizes may reserve
   * again; the viewer runs another layout pass when the document version changes.
   */
  layout(): void {
    if (this.running) return;
    this.running = true;
    try {
      this.writeEmbeds();
      this.position();
      if (this.measure()) {
        this.writeEmbeds();
        this.position();
      }
    } finally {
      this.running = false;
    }
  }

  destroy(): void {
    this.observer?.disconnect();
    this.clear();
  }

  private writeEmbeds(): void {
    const doc = this.host.document();
    if (!doc?.info().capabilities.flowEmbeds) return;
    const embeds: Embed[] = [];
    for (const mounted of this.mounted.values()) {
      const embed = this.toEmbed(mounted, doc);
      if (embed) embeds.push(embed);
    }
    embeds.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    doc.setEmbeds(embeds);
  }

  private toEmbed(mounted: Mounted, doc: DomdocDocument): Embed | undefined {
    const position = mounted.placement.position;
    if (!isFlowPosition(position)) return undefined;
    const loc = doc.locate(position.anchor);
    if (!loc) return undefined;
    const page = doc.page(loc.page);
    const basis = sizeBasis(mounted.placement, page);
    const box = this.flowBox(mounted, basis, position);
    return {
      id: mounted.id,
      unit: position.anchor.unit,
      offset: position.anchor.offset,
      mode: position.mode === "float" ? (position.side === "right" ? "floatRight" : "floatLeft") : position.mode,
      widthPt: box.embedWidth,
      heightPt: box.height,
      gapPt: box.gap,
    };
  }

  private flowBox(mounted: Mounted, basis: Rect, position: FlowPosition) {
    const specified = mounted.placement.width !== undefined ? toPoints(mounted.placement.width, basis.widthPt) : undefined;
    const visual =
      specified ??
      (position.mode === "block" ? basis.widthPt : mounted.measured?.widthPt || (position.mode === "float" ? DEFAULT_FLOAT_PT : DEFAULT_INLINE_PT));
    const align = position.mode === "block" ? (position.align ?? "left") : "left";
    const embedWidth = position.mode === "block" && align !== "left" ? basis.widthPt : visual;
    const offset =
      align === "center" ? Math.max(embedWidth - visual, 0) / 2 : align === "right" ? Math.max(embedWidth - visual, 0) : 0;
    const height =
      mounted.placement.height !== undefined && mounted.placement.height !== "auto"
        ? toPoints(mounted.placement.height, basis.heightPt)
        : mounted.measured?.heightPt || DEFAULT_HEIGHT_PT;
    const gap = mounted.placement.gap === undefined ? 6 : toPoints(mounted.placement.gap, basis.widthPt);
    return { embedWidth: round(embedWidth), visual: round(visual), offset: round(offset), height: round(height), gap: round(gap) };
  }

  private position(): void {
    const doc = this.host.document();
    if (!doc) return;
    const flow = doc.info().capabilities.flowEmbeds;
    const boxes = flow ? doc.embedBoxes() : [];
    for (const mounted of this.mounted.values()) this.apply(mounted, this.frame(mounted, doc, boxes));
  }

  private frame(mounted: Mounted, doc: DomdocDocument, boxes: EmbedBox[]): { page: number; rect: Rect } | undefined {
    const position = mounted.placement.position;
    if (isFlowPosition(position) && doc.info().capabilities.flowEmbeds) {
      const box = boxes.find((item) => item.id === mounted.id);
      if (!box) return undefined;
      const page = doc.page(box.page);
      const sized = this.flowBox(mounted, sizeBasis(mounted.placement, page), position);
      return {
        page: box.page,
        rect: { xPt: box.xPt + sized.offset, yPt: box.yPt, widthPt: sized.visual, heightPt: box.heightPt },
      };
    }
    return this.overlayFrame(mounted, doc);
  }

  private overlayFrame(mounted: Mounted, doc: DomdocDocument): { page: number; rect: Rect } | undefined {
    const placement = mounted.placement;
    const position = placement.position;
    if (position.mode === "page") {
      const page = this.pageAt(doc, position.page);
      if (!page) return undefined;
      const basis = sizeBasis(placement, page);
      const origin = position.relativeTo === "content" ? page.content : { xPt: 0, yPt: 0 };
      const size = this.overlaySize(mounted, basis);
      return {
        page: position.page,
        rect: {
          xPt: origin.xPt + toPoints(position.x, basis.widthPt),
          yPt: origin.yPt + toPoints(position.y, basis.heightPt),
          widthPt: size.width,
          heightPt: size.height,
        },
      };
    }
    const loc = doc.locate(position.anchor);
    if (!loc) return undefined;
    const page = doc.page(loc.page);
    const basis = sizeBasis(placement, page);
    const dx = "dx" in position && position.dx !== undefined ? toPoints(position.dx, basis.widthPt) : 0;
    const dy = "dy" in position && position.dy !== undefined ? toPoints(position.dy, basis.heightPt) : 0;
    let y = loc.yPt + dy;
    if (position.mode === "anchor" && position.align === "bottom") y += loc.heightPt;
    const size = this.overlaySize(mounted, basis);
    return { page: loc.page, rect: { xPt: loc.xPt + dx, yPt: y, widthPt: size.width, heightPt: size.height } };
  }

  private overlaySize(mounted: Mounted, basis: Rect): { width: number; height: number } {
    const width = mounted.placement.width !== undefined ? toPoints(mounted.placement.width, basis.widthPt) : (mounted.measured?.widthPt ?? 0);
    const height =
      mounted.placement.height !== undefined && mounted.placement.height !== "auto"
        ? toPoints(mounted.placement.height, basis.heightPt)
        : (mounted.measured?.heightPt ?? 0);
    return { width: round(width), height: round(height) };
  }

  private apply(mounted: Mounted, frame: { page: number; rect: Rect } | undefined): void {
    const wrapper = mounted.wrapper;
    if (!frame) {
      wrapper.hidden = true;
      return;
    }
    const slot = this.host.slot(frame.page);
    if (!slot) {
      wrapper.hidden = true;
      return;
    }
    wrapper.hidden = false;
    const parent = mounted.placement.layer === "below" ? slot.under : slot.layer;
    if (wrapper.parentElement !== parent) parent.append(wrapper);
    wrapper.dataset.zoom = mounted.placement.zoom ?? "scale";
    wrapper.dataset.interactive = mounted.placement.interactive === false ? "false" : "true";
    const autoWidth = mounted.placement.width === undefined && !isFlowPosition(mounted.placement.position);
    const autoHeight = mounted.placement.height === "auto" || mounted.placement.height === undefined;
    wrapper.style.setProperty("--x", String(round(frame.rect.xPt)));
    wrapper.style.setProperty("--y", String(round(frame.rect.yPt)));
    if (frame.rect.widthPt > 0 && !autoWidth) {
      wrapper.style.setProperty("--w", String(round(frame.rect.widthPt)));
      delete wrapper.dataset.autoWidth;
    } else if (mounted.measured?.widthPt) {
      wrapper.style.setProperty("--w", String(mounted.measured.widthPt));
      delete wrapper.dataset.autoWidth;
    } else {
      wrapper.style.removeProperty("--w");
      wrapper.dataset.autoWidth = "";
    }
    if (frame.rect.heightPt > 0 && mounted.placement.height !== "auto" && mounted.placement.height !== undefined) {
      wrapper.style.setProperty("--h", String(round(frame.rect.heightPt)));
      delete wrapper.dataset.autoHeight;
    } else if (mounted.measured?.heightPt) {
      wrapper.style.setProperty("--h", String(mounted.measured.heightPt));
      wrapper.dataset.autoHeight = "";
    } else {
      wrapper.style.removeProperty("--h");
      wrapper.dataset.autoHeight = "";
    }
    if (autoHeight) wrapper.dataset.autoHeight = "";
  }

  private shouldMeasure(mounted: Mounted): boolean {
    if (mounted.wrapper.hidden) return false;
    const placement = mounted.placement;
    if (placement.height === "auto" || placement.height === undefined) return true;
    return placement.width === undefined;
  }

  /** Updates measured content sizes. Returns whether anything moved by more than half a point. */
  private measure(): boolean {
    let changed = false;
    for (const mounted of this.mounted.values()) {
      if (!this.shouldMeasure(mounted)) continue;
      const zoom = mounted.placement.zoom ?? "scale";
      const px = zoom === "resize" ? PX_PER_PT * this.host.zoom() : PX_PER_PT;
      const widthPt = mounted.body.offsetWidth / px;
      const heightPt = mounted.body.offsetHeight / px;
      if (widthPt < 1 && heightPt < 1) continue;
      const next = { widthPt: round(widthPt), heightPt: round(heightPt) };
      const prev = mounted.measured;
      if (!prev || Math.abs(prev.widthPt - next.widthPt) > MEASURE_EPSILON_PT || Math.abs(prev.heightPt - next.heightPt) > MEASURE_EPSILON_PT) {
        mounted.measured = next;
        changed = true;
      }
    }
    return changed;
  }

  private pageAt(doc: DomdocDocument, index: number) {
    const count = doc.info().pageCount;
    if (index < 0 || index >= count) return undefined;
    return doc.page(index);
  }
}
