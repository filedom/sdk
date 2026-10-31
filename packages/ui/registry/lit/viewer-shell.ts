import type { DomdocViewer, ViewerOptions } from "@domdoc/core";
import "@domdoc/lit";
import { createElement, Upload } from "lucide";
import { LitElement, html } from "lit";
import { button } from "@/components/domdoc/button";
import { domdocProvider, shellState, watchDomdoc } from "@/components/domdoc/domdoc-provider";

const SAMPLE_PDF = "/sdk-docs/samples/hello.pdf";

function icon(node: Parameters<typeof createElement>[0]) {
  return createElement(node, { class: "size-7 text-muted-foreground", "aria-hidden": "true" });
}

export class DomdocViewerShellElement extends LitElement {
  private viewerOptions: ViewerOptions = { toolbar: false };
  private stop = () => {};
  private attached = false;

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    this.setAttribute("data-slot", "viewer-shell");
    this.setAttribute("data-domdoc-state", "empty");
    this.className = "relative flex min-h-0 flex-1 flex-col overflow-hidden bg-canvas";
    this.viewerOptions = domdocProvider(this)?.viewerOptions() ?? { toolbar: false };
    super.connectedCallback();
  }

  override disconnectedCallback(): void {
    this.stop();
    super.disconnectedCallback();
  }

  protected override firstUpdated(): void {
    const viewerEl = this.querySelector("domdoc-viewer") as { viewer?: DomdocViewer } | null;
    if (viewerEl?.viewer) this.attachViewer(viewerEl.viewer);
    this.stop = watchDomdoc(this, () => this.paint());
  }

  private attachViewer(viewer: DomdocViewer): void {
    if (this.attached) return;
    this.attached = true;
    domdocProvider(this)?.attach(viewer);
  }

  private onReady = (event: Event) => {
    const viewer = (event as CustomEvent<DomdocViewer>).detail;
    if (viewer) this.attachViewer(viewer);
  };

  private paint(): void {
    const snapshot = domdocProvider(this)?.store?.getSnapshot() ?? null;
    const status = shellState(snapshot);
    this.setAttribute("data-domdoc-state", status);
    this.querySelector("[data-slot='usage-notice']")?.setAttribute("data-domdoc-state", status);
    const empty = this.querySelector<HTMLElement>("[data-slot='empty-state']");
    if (empty) empty.hidden = status !== "empty" && status !== "error";
    const loading = this.querySelector<HTMLElement>("[data-domdoc-loading]");
    if (loading) loading.hidden = status !== "loading";
    const error = this.querySelector<HTMLElement>("[data-domdoc-error]");
    if (error) {
      const detail = snapshot?.error?.detail ?? "";
      error.hidden = !detail;
      error.textContent = detail;
    }
  }

  private onDragOver = (event: DragEvent) => {
    event.preventDefault();
  };

  private onDrop = (event: DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) void domdocProvider(this)?.store?.viewer.open(file);
  };

  private openSample = async () => {
    const store = domdocProvider(this)?.store;
    if (!store) return;
    const response = await fetch(SAMPLE_PDF);
    if (!response.ok) return;
    await store.viewer.open(new Uint8Array(await response.arrayBuffer()), { name: "hello.pdf" });
  };

  override render() {
    return html`
      <domdoc-viewer
        data-slot="viewer-canvas"
        class="min-h-0 w-full flex-1"
        .options=${this.viewerOptions}
        @domdoc-ready=${this.onReady}
      ></domdoc-viewer>
      <div data-slot="usage-notice" data-domdoc-state="empty" role="status" class="pointer-events-none absolute inset-x-0 top-0 z-20"></div>
      <p data-domdoc-loading hidden class="pointer-events-none absolute left-3 top-3 z-20 rounded-md bg-card px-2 py-1 text-xs text-muted-foreground shadow-sm">
        Opening…
      </p>
      <div data-slot="empty-state" class="absolute inset-0 z-10 flex items-center justify-center bg-canvas p-6">
        <div
          data-slot="dropzone"
          class="flex w-full max-w-md flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card px-8 py-10 text-center text-card-foreground shadow-sm"
          @dragover=${this.onDragOver}
          @drop=${this.onDrop}
        >
          ${icon(Upload)}
          <p class="text-sm font-medium">Drop a document here</p>
          <p class="text-xs text-muted-foreground">PDF or Office file</p>
          <p data-domdoc-error hidden class="text-sm text-destructive"></p>
          ${button({ slot: "open-sample", label: "Open sample", onClick: () => void this.openSample() })}
        </div>
      </div>
    `;
  }
}

if (!customElements.get("domdoc-viewer-shell")) customElements.define("domdoc-viewer-shell", DomdocViewerShellElement);
