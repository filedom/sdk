import type { ElementFactory } from "./dom.js";
import { shouldMount, type RenderMode, type RectLike } from "./render-policy.js";

export interface PageSlot {
  index: number;
  el: HTMLDivElement;
  /** Components placed behind the text. */
  under: HTMLDivElement;
  canvas: HTMLCanvasElement;
  /** Page text for assistive technology and browser find. It is not painted. */
  text: HTMLDivElement;
  /** Set when `text` matches the current runs, so overlay paints do not rebuild it. */
  textKey?: string;
  /** Selection, search, revision marks and the caret. */
  overlay: HTMLDivElement;
  /** Components placed above the text. */
  layer: HTMLDivElement;
  /** `revision @ raster scale` last painted into the canvas. */
  painted?: string;
}

export type PaintMode = "full" | "overlay";

/** Delay after the last zoom step before visible pages are re-rasterized at the new scale. */
export const RERASTER_DELAY_MS = 140;

/**
 * The scrolling stack of page elements. Page boxes are sized in points through CSS
 * variables, so zooming is one style change; canvases are repainted lazily, only for
 * visible pages, once zooming settles.
 */
export class PageStack {
  readonly slots: PageSlot[] = [];
  private readonly visible = new Set<number>();
  private observer?: IntersectionObserver;
  private frame?: number;
  private settle?: ReturnType<typeof setTimeout>;

  constructor(
    readonly container: HTMLElement,
    private readonly h: ElementFactory,
    /** Paints one page. `full` may redraw the canvas; `overlay` only updates marks. */
    private readonly paint: (slot: PageSlot, mode: PaintMode) => void,
    /** New pages are inserted before this node (the caret input), which stays last. */
    private readonly before?: HTMLElement,
  ) {
    const IO = container.ownerDocument.defaultView?.IntersectionObserver;
    if (IO) {
      this.observer = new IO(
        (entries) => {
          for (const entry of entries) {
            const index = Number((entry.target as HTMLElement).dataset.page);
            if (entry.isIntersecting) this.visible.add(index);
            else this.visible.delete(index);
          }
          this.schedule();
        },
        { root: container, rootMargin: "800px 0px" },
      );
    }
  }

  setCount(count: number): void {
    while (this.slots.length > count) {
      const slot = this.slots.pop()!;
      this.observer?.unobserve(slot.el);
      this.visible.delete(slot.index);
      slot.el.remove();
    }
    while (this.slots.length < count) this.slots.push(this.create(this.slots.length));
  }

  clear(): void {
    this.setCount(0);
  }

  size(slot: PageSlot, widthPt: number, heightPt: number): void {
    slot.el.style.setProperty("--pw", String(widthPt));
    slot.el.style.setProperty("--ph", String(heightPt));
  }

  /** Pages in or near the viewport. Empty until the observer reports; all pages without one. */
  /**
   * Whether a document node should mount for the current scrollport.
   * Default mode is `visible`; `prerender` matches the IntersectionObserver margin.
   */
  static elementShouldMount(
    viewport: RectLike,
    element: RectLike,
    mode: RenderMode = "visible",
    margin = 800,
  ): boolean {
    return shouldMount({ viewport, element, mode, margin }) === "mount";
  }

  visibleIndices(): number[] {
    if (!this.observer) return this.slots.map((s) => s.index);
    return [...this.visible].sort((a, b) => a - b);
  }

  /** Content changed: repaint visible pages on the next frame and cancel a pending re-raster. */
  invalidate(): void {
    this.cancelRescale();
    this.schedule();
  }

  /** Zoom changed: CSS already shows it; re-rasterize once zooming pauses. */
  rescaleLater(): void {
    clearTimeout(this.settle);
    this.settle = setTimeout(() => this.schedule(), RERASTER_DELAY_MS);
  }

  cancelRescale(): void {
    clearTimeout(this.settle);
  }

  paintIndices(indices: Iterable<number>, mode: PaintMode): void {
    for (const index of indices) {
      const slot = this.slots[index];
      if (slot) this.paint(slot, mode);
    }
  }

  /** Paints visible pages now. */
  flush(): void {
    if (this.frame !== undefined) this.container.ownerDocument.defaultView?.cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.paintIndices(this.visibleIndices(), "full");
  }

  destroy(): void {
    this.cancelRescale();
    if (this.frame !== undefined) this.container.ownerDocument.defaultView?.cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    this.clear();
  }

  private schedule(): void {
    const win = this.container.ownerDocument.defaultView;
    if (!win?.requestAnimationFrame) {
      this.flush();
      return;
    }
    if (this.frame !== undefined) return;
    this.frame = win.requestAnimationFrame(() => {
      this.frame = undefined;
      this.flush();
    });
  }

  private create(index: number): PageSlot {
    const h = this.h;
    const el = h("div", "dd-page");
    el.dataset.page = String(index);
    const text = h("div", "dd-text");
    text.setAttribute("role", "region");
    text.setAttribute("aria-label", `Page ${index + 1}`);
    const slot: PageSlot = {
      index,
      el,
      under: h("div", "dd-under"),
      canvas: h("canvas"),
      text,
      overlay: h("div", "dd-overlay"),
      layer: h("div", "dd-layer"),
    };
    el.append(slot.under, slot.canvas, slot.text, slot.overlay, slot.layer);
    if (this.before?.parentElement === this.container) this.container.insertBefore(el, this.before);
    else this.container.append(el);
    if (this.observer) this.observer.observe(el);
    else this.visible.add(index);
    return slot;
  }
}
