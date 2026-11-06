import { Show, onCleanup } from "solid-js";
import type { ViewerOptions } from "@filedom/core";
import { FiledomViewer as FiledomHost } from "@filedom/solid";
import { Upload } from "lucide-solid";
import { Button } from "@/components/filedom/button";
import { shellState, useFiledom } from "@/components/filedom/filedom-provider";

const SAMPLE_PDF = "/sdk/docs/samples/hello.pdf";

export function ViewerShell() {
  const api = useFiledom();
  const options: ViewerOptions = { ...api.options(), toolbar: false };
  const canvas = FiledomHost({
    class: "min-h-0 w-full flex-1",
    options,
    onReady: (viewer) => api.attach(viewer),
  });
  canvas.setAttribute("data-slot", "viewer-canvas");
  onCleanup(() => api.store()?.destroy());

  const status = () => shellState(api.snapshot());
  const showEmpty = () => status() === "empty" || status() === "error";
  const errorDetail = () => api.snapshot()?.error?.detail ?? "";

  async function openSample() {
    const store = api.store();
    if (!store) return;
    const response = await fetch(SAMPLE_PDF);
    if (!response.ok) return;
    await store.viewer.open(new Uint8Array(await response.arrayBuffer()), { name: "hello.pdf" });
  }

  function onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) void api.store()?.viewer.open(file);
  }

  return (
    <div
      data-slot="viewer-shell"
      data-filedom-state={status()}
      class="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-canvas"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {canvas}
      <div data-slot="usage-notice" data-filedom-state={status()} role="status" class="pointer-events-none absolute inset-x-0 top-0 z-20" />
      <Show when={status() === "loading"}>
        <p class="pointer-events-none absolute left-3 top-3 z-20 rounded-md bg-card px-2 py-1 text-xs text-muted-foreground shadow-sm">Opening…</p>
      </Show>
      <Show when={showEmpty()}>
        <div data-slot="empty-state" class="absolute inset-0 z-10 flex items-center justify-center bg-canvas p-6">
          <div
            data-slot="dropzone"
            class="flex w-full max-w-md flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card px-8 py-10 text-center text-card-foreground shadow-sm"
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            <Upload size={28} class="text-muted-foreground" />
            <p class="text-sm font-medium">Drop any file here</p>
            <p class="text-xs text-muted-foreground">Such as a document or a media file.</p>
            <Show when={errorDetail()}>
              <p class="text-sm text-destructive">{errorDetail()}</p>
            </Show>
            <Button data-slot="open-sample" onClick={() => void openSample()}>
              Open sample
            </Button>
          </div>
        </div>
      </Show>
    </div>
  );
}
