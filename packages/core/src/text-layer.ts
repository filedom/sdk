import type { ElementFactory } from "./dom.js";
import type { PageView } from "./engine-types.js";

/** Identity of the text currently in a page's layer. Positions are included so reflow rebuilds it. */
export function textLayerKey(view: PageView): string {
  let key = "";
  for (const run of view.runs) {
    if (!run.text) continue;
    key += `${run.unit}\t${run.unitStart}\t${run.text}\t${run.xPt}\t${run.yPt}\t${run.fontSizePt}\n`;
  }
  return key;
}

/**
 * Puts the page text where assistive technology and the browser's find can read it.
 * The text is not laid out on the page: the visible page is the wasm raster, and the
 * only DOM drawn with the content is a component the host placed.
 */
export function fillTextLayer(layer: HTMLElement, view: PageView, _h: ElementFactory): void {
  let text = "";
  for (const run of view.runs) text += run.text;
  if (layer.textContent !== text) layer.textContent = text;
}
