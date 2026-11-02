import type { FiledomDocument } from "./document.js";
import type { Pos, Rect } from "./engine-types.js";
import { FiledomError } from "./errors.js";
import type { FileStore } from "./file-store.js";
import { PX_PER_PT } from "./zoom.js";

/**
 * A length on the page: a number of points, or a string with a unit —
 * `"72pt"`, `"120px"` (CSS pixels at 100% zoom) or `"50%"` (of the size basis).
 */
export type Length = number | `${number}pt` | `${number}px` | `${number}%`;

/**
 * Where a component sits.
 * - `page`: fixed coordinates on a page (`x`/`y` from the page or content-area corner).
 * - `anchor`: an overlay that follows the text at `anchor` as edits reflow pages.
 * - `block`: a band between paragraphs; text moves below it (flow formats).
 * - `inline`: an object inside a line of text, like a character (flow formats).
 * - `float`: beside the text at `anchor`; following lines wrap around it (flow formats).
 *
 * Formats without reflow (`capabilities.flowEmbeds === false`, e.g. PDF) show the flow
 * modes as `anchor` overlays.
 */
export type PlacementPosition =
  | { mode: "page"; page: number; x: Length; y: Length; relativeTo?: "page" | "content" }
  | { mode: "anchor"; anchor: Pos; dx?: Length; dy?: Length; align?: "top" | "bottom" }
  | { mode: "block"; anchor: Pos; align?: "left" | "center" | "right" }
  | { mode: "inline"; anchor: Pos }
  | { mode: "float"; anchor: Pos; side: "left" | "right" };

export type FlowMode = "block" | "inline" | "float";

export interface Placement<P = Record<string, unknown>> {
  id?: string;
  type: string;
  props?: P;
  position: PlacementPosition;
  /** Default: the component's own width (overlays) or 100% of the content width (flow). */
  width?: Length;
  /** `"auto"` measures the rendered component and reserves exactly that space. */
  height?: Length | "auto";
  /** What `%` lengths refer to. Default `content` (the area inside the margins). */
  sizeBasis?: "content" | "page";
  /** Clearance between a flow component and the text around it. Default 6pt. */
  gap?: Length;
  /** Paint above (default) or behind the text. */
  layer?: "above" | "below";
  /**
   * How the component follows zoom: `scale` (default) lays it out at 100% and scales it
   * like the page; `resize` scales its box and lets the content reflow; `fixed` keeps
   * its screen size (pins, badges) while its position follows the page.
   */
  zoom?: "scale" | "resize" | "fixed";
  /** `false` lets pointer events pass through to the text below. Default `true`. */
  interactive?: boolean;
  /** Accessible name of the component region. */
  label?: string;
}

export interface ComponentContext<P = Record<string, unknown>> {
  id: string;
  props: P;
  placement: Placement<P>;
  /** The SPA's shared file store: list, read and subscribe to loaded files. */
  files: FileStore;
  /** The open document (`unitText`, `search`, `revisions`, `span`, ...). */
  document: FiledomDocument;
  /** The element the viewer positions; append your UI here or return one. */
  container: HTMLElement;
}

export interface ComponentHandle<P = Record<string, unknown>> {
  element?: HTMLElement;
  update?(props: P): void;
  destroy?(): void;
}

export type ComponentFactory<P = Record<string, unknown>> = (
  context: ComponentContext<P>,
) => ComponentHandle<P> | HTMLElement | void;

export class ComponentRegistry {
  private readonly factories = new Map<string, ComponentFactory<any>>();

  register<P>(type: string, factory: ComponentFactory<P>): this {
    this.factories.set(type, factory);
    return this;
  }

  unregister(type: string): boolean {
    return this.factories.delete(type);
  }

  get(type: string): ComponentFactory | undefined {
    return this.factories.get(type);
  }

  types(): string[] {
    return [...this.factories.keys()];
  }
}

const LENGTH = /^(-?\d+(?:\.\d+)?)(pt|px|%)$/;

/** Points for `length`; `%` is relative to `basis` points. */
export function toPoints(length: Length, basis: number): number {
  if (typeof length === "number") {
    if (!Number.isFinite(length)) throw new FiledomError("bad-length", String(length));
    return length;
  }
  const match = LENGTH.exec(length.trim());
  if (!match) throw new FiledomError("bad-length", length);
  const value = Number(match[1]);
  switch (match[2]) {
    case "pt":
      return value;
    case "px":
      return value / PX_PER_PT;
    default:
      return (value / 100) * basis;
  }
}

/** The page rectangle `%` lengths of `placement` refer to. */
export function sizeBasis(placement: Placement, page: { widthPt: number; heightPt: number; content: Rect }): Rect {
  return placement.sizeBasis === "page"
    ? { xPt: 0, yPt: 0, widthPt: page.widthPt, heightPt: page.heightPt }
    : page.content;
}

export const isFlowMode = (mode: PlacementPosition["mode"]): mode is FlowMode =>
  mode === "block" || mode === "inline" || mode === "float";
