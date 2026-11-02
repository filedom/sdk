<script lang="ts">
  import { Expand, UnfoldHorizontal, ZoomIn, ZoomOut } from "lucide-svelte";
  import Button from "$lib/components/filedom/Button.svelte";
  import Tooltip from "$lib/components/filedom/Tooltip.svelte";
  import { control, getFiledom } from "$lib/components/filedom/FiledomProvider.svelte";

  const filedom = getFiledom();
  const snapshotStore = filedom.snapshot;
  const snapshot = $derived($snapshotStore);
  const zoomOut = $derived(control(snapshot, "zoomOut", "Zoom out"));
  const zoomReset = $derived(control(snapshot, "zoomReset", "Actual size"));
  const zoomIn = $derived(control(snapshot, "zoomIn", "Zoom in"));
  const fitWidth = $derived(control(snapshot, "fitWidth", "Fit width"));
  const fitPage = $derived(control(snapshot, "fitPage", "Fit page"));
  const percent = $derived(`${Math.round((snapshot?.zoom ?? 1) * 100)}%`);
</script>

<div data-slot="zoom-controls" class="flex shrink-0 items-center gap-0.5">
  {#if !zoomOut.hidden}
    <Tooltip text={zoomOut.title}>
      <Button
        variant="icon"
        data-slot="zoom-out"
        data-action="zoomOut"
        aria-label="Zoom out"
        disabled={zoomOut.disabled}
        title={zoomOut.disabled ? zoomOut.title : undefined}
        onclick={() => filedom.run("zoomOut")}
      >
        <ZoomOut class="size-4" />
      </Button>
    </Tooltip>
  {/if}
  {#if !zoomReset.hidden}
    <Tooltip text={zoomReset.title}>
      <Button
        variant="ghost"
        data-slot="zoom-label"
        data-action="zoomReset"
        class="h-8 min-w-14 px-2 tabular-nums"
        aria-label="Actual size"
        disabled={zoomReset.disabled}
        title={zoomReset.disabled ? zoomReset.title : undefined}
        onclick={() => filedom.run("zoomReset")}
      >
        {percent}
      </Button>
    </Tooltip>
  {/if}
  {#if !zoomIn.hidden}
    <Tooltip text={zoomIn.title}>
      <Button
        variant="icon"
        data-slot="zoom-in"
        data-action="zoomIn"
        aria-label="Zoom in"
        disabled={zoomIn.disabled}
        title={zoomIn.disabled ? zoomIn.title : undefined}
        onclick={() => filedom.run("zoomIn")}
      >
        <ZoomIn class="size-4" />
      </Button>
    </Tooltip>
  {/if}
  {#if !fitWidth.hidden}
    <Tooltip text={fitWidth.title}>
      <Button
        variant="icon"
        data-slot="fit-width"
        data-action="fitWidth"
        aria-label="Fit width"
        disabled={fitWidth.disabled}
        title={fitWidth.disabled ? fitWidth.title : undefined}
        onclick={() => filedom.run("fitWidth")}
      >
        <UnfoldHorizontal class="size-4" />
      </Button>
    </Tooltip>
  {/if}
  {#if !fitPage.hidden}
    <Tooltip text={fitPage.title}>
      <Button
        variant="icon"
        data-slot="fit-page"
        data-action="fitPage"
        aria-label="Fit page"
        disabled={fitPage.disabled}
        title={fitPage.disabled ? fitPage.title : undefined}
        onclick={() => filedom.run("fitPage")}
      >
        <Expand class="size-4" />
      </Button>
    </Tooltip>
  {/if}
</div>
