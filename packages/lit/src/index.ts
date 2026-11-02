import { createViewer, type FiledomViewer as Viewer, type ViewerOptions } from "@filedom/core";
import { LitElement, type PropertyValues } from "lit";

export type { Viewer, ViewerOptions };

/**
 * `<filedom-viewer .options=${options} @filedom-ready=${(e) => e.detail}>`. Renders in
 * light DOM so the viewer's document-level styles apply.
 */
export class FiledomViewerElement extends LitElement {
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
    if (this.viewer) this.dispatchEvent(new CustomEvent("filedom-ready", { detail: this.viewer }));
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.viewer?.destroy();
    this.viewer = undefined;
  }
}

if (!customElements.get("filedom-viewer")) customElements.define("filedom-viewer", FiledomViewerElement);

declare global {
  interface HTMLElementTagNameMap {
    "filedom-viewer": FiledomViewerElement;
  }
}
