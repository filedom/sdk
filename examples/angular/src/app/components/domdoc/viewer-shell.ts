import { AfterViewInit, Component, DestroyRef, ElementRef, Input, ViewChild, computed, inject, signal } from "@angular/core";
import { mountDomdocViewer } from "@domdoc/angular";
import type { ViewerOptions } from "@domdoc/core";
import { FileText, LucideAngularModule } from "lucide-angular";
import { DomdocButton } from "@/components/domdoc/button";
import { DomdocContext, shellState, usageNotice } from "@/components/domdoc/domdoc-provider";

const SAMPLE_PDF = "/sdk-docs/samples/hello.pdf";

@Component({
  selector: "domdoc-viewer-shell",
  standalone: true,
  imports: [DomdocButton, LucideAngularModule],
  host: { class: "relative flex min-h-0 flex-1 flex-col" },
  template: `
    <div data-slot="viewer-shell" class="relative min-h-0 flex-1" [attr.data-domdoc-state]="state()">
      <div
        data-slot="usage-notice"
        class="absolute inset-x-0 top-0 z-20 border-b border-border bg-card px-3 py-1 text-center text-xs text-muted-foreground"
        [attr.data-domdoc-state]="state()"
        [hidden]="!notice()"
      >
        {{ notice() }}
      </div>
      <div #canvas data-slot="viewer-canvas" class="absolute inset-0"></div>
      @if (showEmpty()) {
        <div data-slot="empty-state" class="absolute inset-0 z-10 flex items-center justify-center bg-canvas p-6">
          <div
            data-slot="dropzone"
            class="flex w-full max-w-md flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card px-8 py-10 text-center shadow-sm"
            (dragover)="onDragOver($event)"
            (drop)="onDrop($event)"
          >
            <lucide-icon [img]="fileIcon" [size]="28" class="text-muted-foreground" aria-hidden="true" />
            <p class="text-sm font-medium text-foreground">{{ heading() }}</p>
            <p class="text-sm text-muted-foreground">{{ message() }}</p>
            <button
              domdocButton
              slot="open-sample"
              variant="default"
              [disabled]="!canOpenSample()"
              (click)="openSample()"
            >
              Open sample
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class DomdocViewerShell implements AfterViewInit {
  private readonly ctx = inject(DomdocContext);
  private readonly destroyRef = inject(DestroyRef);
  private readonly failure = signal<string | null>(null);
  readonly fileIcon = FileText;

  @Input() options: ViewerOptions = {};
  @ViewChild("canvas", { static: true }) private canvas?: ElementRef<HTMLElement>;

  readonly state = computed(() => shellState(this.ctx.snapshot()));
  readonly notice = computed(() => usageNotice(this.ctx.snapshot()));
  readonly showEmpty = computed(() => {
    const status = this.state();
    return status === "empty" || status === "error";
  });
  readonly canOpenSample = computed(() => this.ctx.attached() && this.state() !== "loading");
  readonly heading = computed(() => (this.state() === "error" ? "Could not open the document" : "Open a document"));
  readonly message = computed(() => {
    if (this.state() === "error") return this.ctx.snapshot()?.error?.detail ?? this.failure() ?? "Could not open the document";
    return this.failure() ?? "Drop a PDF or Office file, or open the sample.";
  });

  ngAfterViewInit(): void {
    const element = this.canvas?.nativeElement;
    if (!element) return;
    const dark = document.documentElement.classList.contains("dark");
    const viewer = mountDomdocViewer(element, { ...this.options, toolbar: false, theme: dark ? "dark" : "light" }, this.destroyRef);
    this.ctx.bind(viewer);
    this.destroyRef.onDestroy(() => this.ctx.release());
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file || !this.ctx.attached() || this.state() === "loading") return;
    this.failure.set(null);
    try {
      await this.ctx.store.viewer.open(file);
    } catch (error) {
      if (this.ctx.snapshot()?.status !== "error") {
        this.failure.set(error instanceof Error ? error.message : "Could not open the file");
      }
    }
  }

  async openSample(): Promise<void> {
    if (!this.canOpenSample()) return;
    this.failure.set(null);
    try {
      const response = await fetch(SAMPLE_PDF);
      if (!response.ok) {
        this.failure.set(`Could not fetch the sample (${response.status})`);
        return;
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      await this.ctx.store.viewer.open(bytes, { name: "hello.pdf" });
    } catch (error) {
      if (this.ctx.snapshot()?.status !== "error") {
        this.failure.set(error instanceof Error ? error.message : "Could not open the sample");
      }
    }
  }
}
