import type { ViewerStoreSnapshot } from "@domdoc/core";
import { createElement, Expand, UnfoldHorizontal, ZoomIn, ZoomOut } from "lucide";
import { LitElement, html } from "lit";
import { button } from "@/components/domdoc/button";
import { actionState, domdocProvider, watchDomdoc } from "@/components/domdoc/domdoc-provider";
import { separator } from "@/components/domdoc/separator";
import { tooltip } from "@/components/domdoc/tooltip";

function icon(node: Parameters<typeof createElement>[0]) {
  return createElement(node, { class: "size-4", "aria-hidden": "true" });
}

export class DomdocZoomControlsElement extends LitElement {
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
    const zoomOut = actionState(this.snapshot, "zoomOut", "Zoom out");
    const zoomReset = actionState(this.snapshot, "zoomReset", "Actual size");
    const zoomIn = actionState(this.snapshot, "zoomIn", "Zoom in");
    const fitWidth = actionState(this.snapshot, "fitWidth", "Fit width");
    const fitPage = actionState(this.snapshot, "fitPage", "Fit page");
    const percent = `${Math.round((this.snapshot?.zoom ?? 1) * 100)}%`;
    return html`
      <div data-slot="zoom-controls" class="flex items-center gap-0.5">
        ${tooltip(
          zoomOut.title,
          button({
            variant: "icon",
            slot: "zoom-out",
            action: "zoomOut",
            hidden: zoomOut.hidden,
            disabled: zoomOut.disabled,
            title: zoomOut.title,
            ariaLabel: "Zoom out",
            label: icon(ZoomOut),
            onClick: this.run("zoomOut"),
          }),
        )}
        ${button({
          variant: "ghost",
          slot: "zoom-label",
          action: "zoomReset",
          class: "h-8 min-w-14 px-2 text-xs tabular-nums",
          hidden: zoomReset.hidden,
          disabled: zoomReset.disabled,
          title: zoomReset.title,
          label: percent,
          onClick: () => domdocProvider(this)?.store?.viewer.setZoom(1),
        })}
        ${tooltip(
          zoomIn.title,
          button({
            variant: "icon",
            slot: "zoom-in",
            action: "zoomIn",
            hidden: zoomIn.hidden,
            disabled: zoomIn.disabled,
            title: zoomIn.title,
            ariaLabel: "Zoom in",
            label: icon(ZoomIn),
            onClick: this.run("zoomIn"),
          }),
        )}
        ${separator("vertical")}
        ${tooltip(
          fitWidth.title,
          button({
            variant: "icon",
            slot: "fit-width",
            action: "fitWidth",
            hidden: fitWidth.hidden,
            disabled: fitWidth.disabled,
            title: fitWidth.title,
            ariaLabel: "Fit width",
            label: icon(UnfoldHorizontal),
            onClick: this.run("fitWidth"),
          }),
        )}
        ${tooltip(
          fitPage.title,
          button({
            variant: "icon",
            slot: "fit-page",
            action: "fitPage",
            hidden: fitPage.hidden,
            disabled: fitPage.disabled,
            title: fitPage.title,
            ariaLabel: "Fit page",
            label: icon(Expand),
            onClick: this.run("fitPage"),
          }),
        )}
      </div>
    `;
  }
}

if (!customElements.get("domdoc-zoom-controls")) customElements.define("domdoc-zoom-controls", DomdocZoomControlsElement);
