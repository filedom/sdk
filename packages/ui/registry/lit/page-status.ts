import type { ViewerStoreSnapshot } from "@filedom/core";
import { LitElement, html } from "lit";
import { watchFiledom } from "@/components/filedom/filedom-provider";

export class FiledomPageStatusElement extends LitElement {
  private snapshot: ViewerStoreSnapshot | null = null;
  private stop = () => {};

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.classList.add("min-w-0", "max-w-[40%]");
    this.stop = watchFiledom(this, (snapshot) => {
      this.snapshot = snapshot;
      this.requestUpdate();
    });
  }

  override disconnectedCallback(): void {
    this.stop();
    super.disconnectedCallback();
  }

  override render() {
    const doc = this.snapshot?.document;
    const label = doc
      ? `${doc.name ?? "Document"} · ${doc.pageCount === 1 ? "1 page" : `${doc.pageCount} pages`}`
      : "No document";
    return html`<p data-slot="page-status" class="truncate text-xs text-muted-foreground">${label}</p>`;
  }
}

if (!customElements.get("filedom-page-status")) customElements.define("filedom-page-status", FiledomPageStatusElement);
