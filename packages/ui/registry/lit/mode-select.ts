import type { ViewMode, ViewerStoreSnapshot } from "@domdoc/core";
import { LitElement, html } from "lit";
import { actionState, domdocProvider, watchDomdoc } from "@/components/domdoc/domdoc-provider";
import { select } from "@/components/domdoc/select";

export class DomdocModeSelectElement extends LitElement {
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

  private onChange = (event: Event) => {
    const value = (event.target as HTMLSelectElement).value;
    if (value === "live" || value === "track" || value === "view") {
      domdocProvider(this)?.store?.viewer.setViewMode(value as ViewMode);
    }
  };

  override render() {
    const live = actionState(this.snapshot, "live", "Live");
    const track = actionState(this.snapshot, "track", "Track");
    const view = actionState(this.snapshot, "view", "View");
    const option = (id: string, label: string, state: { hidden: boolean; disabled: boolean; title: string }) => html`
      <option value=${id} ?disabled=${state.disabled || state.hidden} ?hidden=${state.hidden} title=${state.title}>${label}</option>
    `;
    return html`<div class="inline-flex">
      ${select({
        slot: "mode-select",
        class: "w-[7.5rem]",
        ariaLabel: "View mode",
        value: this.snapshot?.viewMode ?? "live",
        onChange: this.onChange,
        label: html`${option("live", "Live", live)}${option("track", "Track", track)}${option("view", "View", view)}`,
      })}
    </div>`;
  }
}

if (!customElements.get("domdoc-mode-select")) customElements.define("domdoc-mode-select", DomdocModeSelectElement);
