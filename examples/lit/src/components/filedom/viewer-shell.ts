import type { FiledomViewer, ViewerOptions } from "@filedom/core";
import "@filedom/lit";
import { createElement, Upload } from "lucide";
import { LitElement, html } from "lit";
import { button } from "@/components/filedom/button";
import { filedomProvider, shellState, watchFiledom } from "@/components/filedom/filedom-provider";

const SAMPLE_PDF = "/sdk-docs/samples/hello.pdf";

function icon(node: Parameters<typeof createElement>[0]) {
  return createElement(node, { class: "size-7 text-muted-foreground", "aria-hidden": "true" });
}

export class FiledomViewerShellElement extends LitElement {
  private viewerOptions: ViewerOptions = { toolbar: false };
  private stop = () => {};
  private attached = false;

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    this.setAttribute("data-slot", "viewer-shell");
    this.setAttribute("data-filedom-state", "empty");
    this.className = "relative flex min-h-0 flex-1 flex-col overflow-hidden bg-canvas";
    this.viewerOptions = filedomProvider(this)?.viewerOptions() ?? { toolbar: false };
    super.connectedCallback();
  }

  override disconnectedCallback(): void {
    this.stop();
    super.disconnectedCallback();
  }

  protected override firstUpdated(): void {
    const viewerEl = this.querySelector("filedom-viewer") as { viewer?: FiledomViewer } | null;
    if (viewerEl?.viewer) this.attachViewer(viewerEl.viewer);
    this.stop = watchFiledom(this, () => this.paint());
  }

  private attachViewer(viewer: FiledomViewer): void {
    if (this.attached) return;
    this.attached = true;
    filedomProvider(this)?.attach(viewer);
  }

  private onReady = (event: Event) => {
    const viewer = (event as CustomEvent<FiledomViewer>).detail;
    if (viewer) this.attachViewer(viewer);
  };

  private paint(): void {
    const snapshot = filedomProvider(this)?.store?.getSnapshot() ?? null;
    const status = shellState(snapshot);
    this.setAttribute("data-filedom-state", status);
    this.querySelector("[data-slot='usage-notice']")?.setAttribute("data-filedom-state", status);
    const empty = this.querySelector<HTMLElement>("[data-slot='empty-state']");
    if (empty) empty.hidden = status !== "empty" && status !== "error";
    const loading = this.querySelector<HTMLElement>("[data-filedom-loading]");
    if (loading) loading.hidden = status !== "loading";
    const error = this.querySelector<HTMLElement>("[data-filedom-error]");
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
    if (file) void filedomProvider(this)?.store?.viewer.open(file);
  };

  private openSample = async () => {
    const store = filedomProvider(this)?.store;
    if (!store) return;
    const response = await fetch(SAMPLE_PDF);
    if (!response.ok) return;
    await store.viewer.open(new Uint8Array(await response.arrayBuffer()), { name: "hello.pdf" });
  };

  override render() {
    return html`
      <filedom-viewer
        data-slot="viewer-canvas"
        class="min-h-0 w-full flex-1"
        .options=${this.viewerOptions}
        @filedom-ready=${this.onReady}
      ></filedom-viewer>
      <div data-slot="usage-notice" data-filedom-state="empty" role="status" class="pointer-events-none absolute inset-x-0 top-0 z-20"></div>
      <p data-filedom-loading hidden class="pointer-events-none absolute left-3 top-3 z-20 rounded-md bg-card px-2 py-1 text-xs text-muted-foreground shadow-sm">
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
          <p data-filedom-error hidden class="text-sm text-destructive"></p>
          ${button({ slot: "open-sample", label: "Open sample", onClick: () => void this.openSample() })}
        </div>
      </div>
    `;
  }
}

if (!customElements.get("filedom-viewer-shell")) customElements.define("filedom-viewer-shell", FiledomViewerShellElement);
