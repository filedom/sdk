<script lang="ts">
  import { Redo2, Undo2 } from "lucide-svelte";
  import Button from "$lib/components/domdoc/Button.svelte";
  import FileButton from "$lib/components/domdoc/FileButton.svelte";
  import ModeSelect from "$lib/components/domdoc/ModeSelect.svelte";
  import PageStatus from "$lib/components/domdoc/PageStatus.svelte";
  import SearchBar from "$lib/components/domdoc/SearchBar.svelte";
  import Separator from "$lib/components/domdoc/Separator.svelte";
  import ThemeToggle from "$lib/components/domdoc/ThemeToggle.svelte";
  import Tooltip from "$lib/components/domdoc/Tooltip.svelte";
  import ZoomControls from "$lib/components/domdoc/ZoomControls.svelte";
  import { control, getDomdoc } from "$lib/components/domdoc/DomdocProvider.svelte";

  const domdoc = getDomdoc();
  const snapshotStore = domdoc.snapshot;
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
        onclick={() => domdoc.run("undo")}
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
        onclick={() => domdoc.run("redo")}
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
