<script lang="ts">
  import { Redo2, Undo2 } from "lucide-svelte";
  import Button from "$lib/components/filedom/Button.svelte";
  import FileButton from "$lib/components/filedom/FileButton.svelte";
  import ModeSelect from "$lib/components/filedom/ModeSelect.svelte";
  import PageStatus from "$lib/components/filedom/PageStatus.svelte";
  import SearchBar from "$lib/components/filedom/SearchBar.svelte";
  import Separator from "$lib/components/filedom/Separator.svelte";
  import ThemeToggle from "$lib/components/filedom/ThemeToggle.svelte";
  import Tooltip from "$lib/components/filedom/Tooltip.svelte";
  import ZoomControls from "$lib/components/filedom/ZoomControls.svelte";
  import { control, getFiledom } from "$lib/components/filedom/FiledomProvider.svelte";

  const filedom = getFiledom();
  const snapshotStore = filedom.snapshot;
  const snapshot = $derived($snapshotStore);
  const undo = $derived(control(snapshot, "undo", "Undo"));
  const redo = $derived(control(snapshot, "redo", "Redo"));
</script>

<div
  data-slot="toolbar"
  role="toolbar"
  aria-label="Viewer"
  class="flex h-toolbar shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-card px-2 shadow-sm"
>
  {#if !undo.hidden}
    <Tooltip text={undo.title}>
      <Button
        variant="icon"
        data-slot="undo"
        data-action="undo"
        aria-label="Undo"
        disabled={undo.disabled}
        title={undo.disabled ? undo.title : undefined}
        onclick={() => filedom.run("undo")}
      >
        <Undo2 class="size-4" />
      </Button>
    </Tooltip>
  {/if}
  {#if !redo.hidden}
    <Tooltip text={redo.title}>
      <Button
        variant="icon"
        data-slot="redo"
        data-action="redo"
        aria-label="Redo"
        disabled={redo.disabled}
        title={redo.disabled ? redo.title : undefined}
        onclick={() => filedom.run("redo")}
      >
        <Redo2 class="size-4" />
      </Button>
    </Tooltip>
  {/if}
  <Separator orientation="vertical" />
  <FileButton />
  <Separator orientation="vertical" />
  <ZoomControls />
  <Separator orientation="vertical" />
  <SearchBar />
  <div class="ml-auto flex shrink-0 items-center gap-1">
    <ModeSelect />
    <ThemeToggle />
    <PageStatus />
  </div>
</div>
