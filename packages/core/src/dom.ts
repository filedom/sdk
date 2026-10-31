import type { Rect } from "./engine-types.js";
import { icon, type IconName } from "./icons.js";

export type ElementFactory = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
) => HTMLElementTagNameMap[K];

export function elementFactory(doc: Document): ElementFactory {
  return (tag, className) => {
    const el = doc.createElement(tag);
    if (className) el.className = className;
    return el;
  };
}

/**
 * Positions an `.dd-abs` element at a page rectangle in points. The stylesheet multiplies
 * the point values by `--dd-scale`, so zooming moves every mark without touching it.
 */
export function placeAt(el: HTMLElement, rect: Rect): void {
  el.style.setProperty("--x", String(rect.xPt));
  el.style.setProperty("--y", String(rect.yPt));
  el.style.setProperty("--w", String(rect.widthPt));
  el.style.setProperty("--h", String(rect.heightPt));
}

export function button(
  h: ElementFactory,
  label: string,
  onClick: () => void,
  title?: string,
  glyph?: IconName,
): HTMLButtonElement {
  const el = h("button");
  el.type = "button";
  const name = title ?? label;
  if (glyph) {
    el.classList.add("dd-icon");
    el.title = name;
    el.setAttribute("aria-label", name);
    el.append(icon(el.ownerDocument, glyph));
  } else {
    el.textContent = label;
    if (title) {
      el.title = title;
      el.setAttribute("aria-label", title);
    }
  }
  el.addEventListener("click", onClick);
  return el;
}
