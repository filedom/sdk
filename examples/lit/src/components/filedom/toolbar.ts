import { createElement, Redo2, Undo2 } from "lucide";
import { LitElement, html } from "lit";
import type { ViewerStoreSnapshot } from "@filedom/core";
import { button } from "@/components/filedom/button";
import { actionState, filedomProvider, watchFiledom } from "@/components/filedom/filedom-provider";
import "@/components/filedom/file-button";
import "@/components/filedom/mode-select";
import "@/components/filedom/page-status";
import "@/components/filedom/search-bar";
import { separator } from "@/components/filedom/separator";
import "@/components/filedom/theme-toggle";
import { tooltip } from "@/components/filedom/tooltip";
import "@/components/filedom/zoom-controls";

function icon(node: Parameters<typeof createElement>[0]) {
  return createElement(node, { class: "size-4", "aria-hidden": "true" });
}

export class FiledomToolbarElement extends LitElement {
  private snapshot: ViewerStoreSnapshot | null = null;
  private stop = () => {};

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.stop = watchFiledom(this, (snapshot) => {
      this.snapshot = snapshot;
      this.requestUpdate();
    });
  }

  override disconnectedCallback(): void {
    this.stop();
    super.disconnectedCallback();
  }

  private run(id: string) {
    return () => filedomProvider(this)?.store?.run(id);
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
        <filedom-file-button></filedom-file-button>
        ${separator("vertical")}
        <filedom-zoom-controls></filedom-zoom-controls>
        ${separator("vertical")}
        <filedom-search-bar></filedom-search-bar>
        <filedom-mode-select></filedom-mode-select>
        <div class="min-w-0 flex-1"></div>
        <filedom-page-status></filedom-page-status>
        <filedom-theme-toggle></filedom-theme-toggle>
      </div>
    `;
  }
}

if (!customElements.get("filedom-toolbar")) customElements.define("filedom-toolbar", FiledomToolbarElement);
