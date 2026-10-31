import type { ViewerStoreSnapshot } from "@domdoc/core";
import { createElement, ChevronDown, ChevronUp, Search } from "lucide";
import { LitElement, html } from "lit";
import { button } from "@/components/domdoc/button";
import { actionState, domdocProvider, watchDomdoc } from "@/components/domdoc/domdoc-provider";
import { textInput } from "@/components/domdoc/input";
import { tooltip } from "@/components/domdoc/tooltip";

function icon(node: Parameters<typeof createElement>[0]) {
  return createElement(node, { class: "size-4", "aria-hidden": "true" });
}

export class DomdocSearchBarElement extends LitElement {
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

  protected override updated(): void {
    const input = this.querySelector<HTMLInputElement>("[data-slot='search-input']");
    const query = this.snapshot?.search.query ?? "";
    if (input && document.activeElement !== input && input.value !== query) input.value = query;
  }

  private onInput = (event: Event) => {
    domdocProvider(this)?.store?.viewer.search((event.target as HTMLInputElement).value);
  };

  private onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    domdocProvider(this)?.store?.run(event.shiftKey ? "findPrev" : "findNext");
  };

  override render() {
    const search = actionState(this.snapshot, "search", "Search");
    const prev = actionState(this.snapshot, "findPrev", "Previous match");
    const next = actionState(this.snapshot, "findNext", "Next match");
    const hits = this.snapshot?.search;
    const count = hits?.hitCount ? `${hits.hitIndex + 1} / ${hits.hitCount}` : "0";
    return html`
      <div data-slot="search-bar" class="flex items-center gap-0.5">
        <div class="relative" ?hidden=${search.hidden}>
          <span class="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">${icon(Search)}</span>
          ${textInput({
            slot: "search-input",
            action: "search",
            type: "text",
            placeholder: "Search",
            ariaLabel: "Search",
            class: "w-40 pl-7",
            hidden: search.hidden,
            disabled: search.disabled,
            title: search.title,
            onInput: this.onInput,
            onKeyDown: this.onKeyDown,
          })}
        </div>
        ${tooltip(
          prev.title,
          button({
            variant: "icon",
            slot: "search-prev",
            action: "findPrev",
            hidden: prev.hidden,
            disabled: prev.disabled,
            title: prev.title,
            ariaLabel: "Previous match",
            label: icon(ChevronUp),
            onClick: () => domdocProvider(this)?.store?.run("findPrev"),
          }),
        )}
        <span data-slot="search-count" class="min-w-12 px-1 text-center text-xs tabular-nums text-muted-foreground">${count}</span>
        ${tooltip(
          next.title,
          button({
            variant: "icon",
            slot: "search-next",
            action: "findNext",
            hidden: next.hidden,
            disabled: next.disabled,
            title: next.title,
            ariaLabel: "Next match",
            label: icon(ChevronDown),
            onClick: () => domdocProvider(this)?.store?.run("findNext"),
          }),
        )}
      </div>
    `;
  }
}

if (!customElements.get("domdoc-search-bar")) customElements.define("domdoc-search-bar", DomdocSearchBarElement);
