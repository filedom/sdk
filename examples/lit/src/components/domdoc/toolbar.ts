import { createElement, Redo2, Undo2 } from "lucide";
import { LitElement, html } from "lit";
import type { ViewerStoreSnapshot } from "@domdoc/core";
import { button } from "@/components/domdoc/button";
import { actionState, domdocProvider, watchDomdoc } from "@/components/domdoc/domdoc-provider";
import "@/components/domdoc/file-button";
import "@/components/domdoc/mode-select";
import "@/components/domdoc/page-status";
import "@/components/domdoc/search-bar";
import { separator } from "@/components/domdoc/separator";
import "@/components/domdoc/theme-toggle";
import { tooltip } from "@/components/domdoc/tooltip";
import "@/components/domdoc/zoom-controls";

function icon(node: Parameters<typeof createElement>[0]) {
  return createElement(node, { class: "size-4", "aria-hidden": "true" });
}

export class DomdocToolbarElement extends LitElement {
  private snapshot: ViewerStoreSnapshot | null = null;
  private stop = () => {};

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.stop = watchDomdoc(this, (snapshot) => {
      this.snapshot = snapshot;
      this.requestUpdate();
    });
  }

  override disconnectedCallback(): void {
    this.stop();
    super.disconnectedCallback();
  }

  private run(id: string) {
    return () => domdocProvider(this)?.store?.run(id);
  }

  override render() {
    const undo = actionState(this.snapshot, "undo", "Undo");
    const redo = actionState(this.snapshot, "redo", "Redo");
    return html`
      <div
        data-slot="toolbar"
        role="toolbar"
        aria-label="Document"
        class="flex h-toolbar shrink-0 items-center gap-1 border-b border-border bg-card px-2 text-card-foreground"
      >
        ${tooltip(
          undo.title,
          button({
            variant: "icon",
            slot: "undo",
            action: "undo",
            hidden: undo.hidden,
            disabled: undo.disabled,
            title: undo.title,
            ariaLabel: "Undo",
            label: icon(Undo2),
            onClick: this.run("undo"),
          }),
        )}
        ${tooltip(
          redo.title,
          button({
            variant: "icon",
            slot: "redo",
            action: "redo",
            hidden: redo.hidden,
            disabled: redo.disabled,
            title: redo.title,
            ariaLabel: "Redo",
            label: icon(Redo2),
            onClick: this.run("redo"),
          }),
        )}
        ${separator("vertical")}
        <domdoc-file-button></domdoc-file-button>
        ${separator("vertical")}
        <domdoc-zoom-controls></domdoc-zoom-controls>
        ${separator("vertical")}
        <domdoc-search-bar></domdoc-search-bar>
        <domdoc-mode-select></domdoc-mode-select>
        <div class="min-w-0 flex-1"></div>
        <domdoc-page-status></domdoc-page-status>
        <domdoc-theme-toggle></domdoc-theme-toggle>
      </div>
    `;
  }
}

if (!customElements.get("domdoc-toolbar")) customElements.define("domdoc-toolbar", DomdocToolbarElement);
