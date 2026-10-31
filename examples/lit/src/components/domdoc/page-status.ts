import type { ViewerStoreSnapshot } from "@domdoc/core";
import { LitElement, html } from "lit";
import { watchDomdoc } from "@/components/domdoc/domdoc-provider";

export class DomdocPageStatusElement extends LitElement {
  private snapshot: ViewerStoreSnapshot | null = null;
  private stop = () => {};

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.classList.add("min-w-0", "max-w-[40%]");
    this.stop = watchDomdoc(this, (snapshot) => {
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

if (!customElements.get("domdoc-page-status")) customElements.define("domdoc-page-status", DomdocPageStatusElement);
