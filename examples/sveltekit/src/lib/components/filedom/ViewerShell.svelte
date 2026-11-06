<script lang="ts">
  import type { Snippet } from "svelte";
  import type { ViewerStoreSnapshot } from "@filedom/core";
  import { filedom, type FiledomActionParams, type Viewer, type ViewerOptions } from "@filedom/svelte";
  import { FileUp } from "lucide-svelte";
  import Button from "$lib/components/filedom/Button.svelte";
  import { provideFiledom } from "$lib/components/filedom/FiledomProvider.svelte";

  const SHELL_STATES = ["empty", "loading", "ready", "error", "blocked"] as const;
  type ShellState = (typeof SHELL_STATES)[number];

  let {
    options = {},
    sampleUrl = "/sdk/docs/samples/hello.pdf",
    children,
  }: {
    options?: ViewerOptions;
    /** Fetched by the open-sample control. Absolute so it does not follow the example base. */
    sampleUrl?: string;
    children?: Snippet;
  } = $props();

  // One options object, with the built-in toolbar off, so the action does not recreate the viewer.
  const viewerOptions: ViewerOptions = { ...options, toolbar: false };
  let viewer = $state<Viewer | null>(null);
  let openError = $state<string | null>(null);

  const binding = provideFiledom();
  const snapshotStore = binding.snapshot;
  const snapshot = $derived($snapshotStore ?? null);

  function onReady(next: Viewer) {
    viewer = next;
  }

  const actionParams: FiledomActionParams = { options: viewerOptions, onReady };

  $effect(() => {
    if (!viewer) return;
    return binding.attach(viewer);
  });

  function readNotice(value: ViewerStoreSnapshot | null): "trial" | "blocked" | null {
    const notice = (value as { usageNotice?: unknown } | null)?.usageNotice;
    return notice === "trial" || notice === "blocked" ? notice : null;
  }

  function isShellState(value: string): value is ShellState {
    return (SHELL_STATES as readonly string[]).includes(value);
  }

  function shellState(value: ViewerStoreSnapshot | null): ShellState {
    if (readNotice(value) === "blocked" || value?.error?.code === "usage-blocked") return "blocked";
    const status = value?.status ?? "empty";
    return isShellState(status) ? status : "empty";
  }

  const notice = $derived(readNotice(snapshot));
  const state = $derived(shellState(snapshot));

  async function openSample() {
    if (!viewer) return;
    openError = null;
    try {
      const response = await fetch(sampleUrl);
      if (!response.ok) throw new Error(`Could not fetch the sample (${response.status})`);
      await viewer.open(new Uint8Array(await response.arrayBuffer()), { name: "hello.pdf" });
    } catch (error) {
      openError = error instanceof Error ? error.message : "Could not open the sample";
    }
  }

  function allowDrop(event: DragEvent) {
    event.preventDefault();
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) void viewer?.open(file);
  }
</script>

<div
  data-slot="viewer-shell"
  data-filedom-state={state}
  class="relative flex h-full min-h-0 flex-col overflow-hidden bg-background font-sans text-foreground"
>
  {@render children?.()}

  <div class="relative min-h-0 flex-1 bg-canvas">
    <div data-slot="viewer-canvas" class="absolute inset-0" hidden={state === "blocked"} use:filedom={actionParams}></div>

    {#if state === "empty" || state === "error"}
      <div data-slot="empty-state" class="absolute inset-0 z-10 flex items-center justify-center p-6">
        <div
          data-slot="dropzone"
          class="flex w-full max-w-md flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card p-8 text-center shadow-sm"
          ondragover={allowDrop}
          ondrop={onDrop}
        >
          <FileUp class="size-8 text-muted-foreground" />
          <p class="text-sm text-foreground">Drop a document here</p>
          {#if openError || snapshot?.error}
            <p class="text-xs text-destructive">{openError || snapshot?.error?.detail}</p>
          {/if}
          <Button variant="default" data-slot="open-sample" onclick={() => void openSample()}>Open sample</Button>
        </div>
      </div>
    {/if}

    {#if state === "blocked"}
      <div
        data-slot="usage-notice"
        data-state="blocked"
        class="absolute inset-0 z-20 flex items-center justify-center bg-background p-6 text-center"
      >
        <p class="text-sm text-foreground">Usage of filedom is blocked.</p>
      </div>
    {/if}
  </div>

  {#if notice === "trial"}
    <div data-slot="usage-notice" data-state="trial" class="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center p-1">
      <p class="rounded-md border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground shadow-sm">Trial: unlicensed filedom</p>
    </div>
  {/if}
</div>
