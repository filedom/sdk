import { createViewer, type DomdocViewer as Viewer, type ViewerOptions } from "@domdoc/core";
import { LitElement, type PropertyValues } from "lit";

export type { Viewer, ViewerOptions };

/**
 * `<domdoc-viewer .options=${options} @domdoc-ready=${(e) => e.detail}>`. Renders in
 * light DOM so the viewer's document-level styles apply.
 */
export class DomdocViewerElement extends LitElement {
  static override properties = { options: { attribute: false } };
  declare options?: ViewerOptions;
  viewer?: Viewer;

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has("options")) return;
    this.viewer?.destroy();
    this.viewer = this.options ? createViewer(this, this.options) : undefined;
    if (this.viewer) this.dispatchEvent(new CustomEvent("domdoc-ready", { detail: this.viewer }));
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.viewer?.destroy();
    this.viewer = undefined;
  }
}

if (!customElements.get("domdoc-viewer")) customElements.define("domdoc-viewer", DomdocViewerElement);

declare global {
  interface HTMLElementTagNameMap {
    "domdoc-viewer": DomdocViewerElement;
  }
}
