<script lang="ts">
  import { FolderOpen } from "lucide-svelte";
  import Button from "$lib/components/domdoc/Button.svelte";
  import Tooltip from "$lib/components/domdoc/Tooltip.svelte";
  import { control, getDomdoc } from "$lib/components/domdoc/DomdocProvider.svelte";

  const domdoc = getDomdoc();
  const snapshotStore = domdoc.snapshot;
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
      onclick={() => domdoc.run("open")}
    >
      <FolderOpen class="size-4" />
    </Button>
  </Tooltip>
{/if}
