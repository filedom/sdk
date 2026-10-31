import type { ViewerStoreSnapshot } from "@domdoc/core";
import { createElement, FolderOpen } from "lucide";
import { LitElement, html } from "lit";
import { button } from "@/components/domdoc/button";
import { actionState, domdocProvider, watchDomdoc } from "@/components/domdoc/domdoc-provider";
import { tooltip } from "@/components/domdoc/tooltip";

function icon(node: Parameters<typeof createElement>[0]) {
  return createElement(node, { class: "size-4", "aria-hidden": "true" });
}

export class DomdocFileButtonElement extends LitElement {
  private snapshot: ViewerStoreSnapshot | null = null;
  private stop = () => {};

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.classList.add("inline-flex");
    this.stop = watchDomdoc(this, (snapshot) => {
      this.snapshot = snapshot;
      this.requestUpdate();
    });
  }

  override disconnectedCallback(): void {
    this.stop();
    super.disconnectedCallback();
  }

  private pick = () => {
    this.querySelector<HTMLInputElement>("input[type=file]")?.click();
  };

  private onFile = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (file) void domdocProvider(this)?.store?.viewer.open(file);
  };

  override render() {
    const open = actionState(this.snapshot, "open", "Open");
    return html`
      ${tooltip(
        open.title,
        button({
          variant: "icon",
          slot: "file-button",
          action: "open",
          hidden: open.hidden,
          disabled: open.disabled,
          title: open.title,
          ariaLabel: "Open",
          label: icon(FolderOpen),
          onClick: this.pick,
        }),
      )}
      <input type="file" class="sr-only" tabindex="-1" aria-hidden="true" @change=${this.onFile} />
    `;
  }
}

if (!customElements.get("domdoc-file-button")) customElements.define("domdoc-file-button", DomdocFileButtonElement);
