import type { ComponentChildren, TargetedDragEvent } from "preact";
import { useState } from "preact/hooks";
import { Button } from "@/components/filedom/button";
import { useFiledom } from "@/components/filedom/filedom-provider";
import { cn, plainClass } from "@/lib/cn";
import type { ViewerStore, ViewerStoreSnapshot } from "@filedom/core";

const SAMPLE_PDF = "/sdk-docs/samples/hello.pdf";

type ShellState = "empty" | "loading" | "ready" | "error" | "blocked";

function shellState(snapshot: ViewerStoreSnapshot | null): ShellState {
  if (!snapshot) return "empty";
  if (snapshot.error?.code === "usage-blocked") return "blocked";
  const notice = (snapshot as ViewerStoreSnapshot & { usageNotice?: string | null }).usageNotice;
  if (notice === "blocked") return "blocked";
  return snapshot.status;
}

async function openSample(store: ViewerStore): Promise<void> {
  const response = await fetch(SAMPLE_PDF);
  if (!response.ok) throw new Error(`Could not fetch the sample (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  await store.viewer.open(bytes, { name: "hello.pdf" });
}

export function ViewerShell({ children, className }: { children?: ComponentChildren; className?: string }) {
  const { store, snapshot } = useFiledom();
  const state = shellState(snapshot);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const showEmpty = state === "empty" || state === "error";
  const detail = state === "error" ? snapshot?.error?.detail ?? sampleError : sampleError;

  function onDragOver(event: TargetedDragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function onDrop(event: TargetedDragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file && store) void store.viewer.open(file);
  }

  return (
    <div
      data-slot="viewer-shell"
      data-filedom-state={state}
      className={cn("relative flex min-h-0 flex-1 flex-col bg-canvas text-foreground", plainClass(className))}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div
        data-slot="usage-notice"
        data-state={state === "blocked" ? "blocked" : undefined}
        hidden={state !== "blocked"}
        className="shrink-0 border-b border-border bg-destructive/10 px-3 py-1 text-center text-sm text-destructive"
      >
        {state === "blocked" ? snapshot?.error?.detail ?? "Blocked" : null}
      </div>
      <div className="relative min-h-0 flex-1">
        <div data-slot="viewer-canvas" className="h-full">
          {children}
        </div>
        {showEmpty ? (
          <div data-slot="empty-state" className="absolute inset-0 z-10 flex items-center justify-center bg-canvas/95 p-6">
            <div
              data-slot="dropzone"
              className="flex w-full max-w-md flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card px-8 py-10 text-center shadow-sm"
            >
              <p className="text-sm font-medium">Drop a document here</p>
              <p className="text-sm text-muted-foreground">PDF and Office files open in the viewer.</p>
              {detail ? <p className="text-sm text-destructive">{detail}</p> : null}
              <Button
                data-slot="open-sample"
                disabled={!store}
                onClick={() => {
                  if (!store) return;
                  setSampleError(null);
                  void openSample(store).catch((error: unknown) => {
                    setSampleError(error instanceof Error ? error.message : "Could not open the sample");
                  });
                }}
              >
                Open sample
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
