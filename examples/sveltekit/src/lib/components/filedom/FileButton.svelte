<script lang="ts">
  import { FolderOpen } from "lucide-svelte";
  import Button from "$lib/components/filedom/Button.svelte";
  import Tooltip from "$lib/components/filedom/Tooltip.svelte";
  import { control, getFiledom } from "$lib/components/filedom/FiledomProvider.svelte";

  const filedom = getFiledom();
  const snapshotStore = filedom.snapshot;
  const snapshot = $derived($snapshotStore);
  const open = $derived(control(snapshot, "open", "Open"));
</script>

{#if !open.hidden}
  <Tooltip text={open.title}>
    <Button
      variant="icon"
      data-slot="file-button"
      data-action="open"
      aria-label="Open"
      disabled={open.disabled}
      title={open.disabled ? open.title : undefined}
      onclick={() => filedom.run("open")}
    >
      <FolderOpen class="size-4" />
    </Button>
  </Tooltip>
{/if}
