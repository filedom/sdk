<script lang="ts">
  import { getDomdoc } from "@/components/domdoc/DomdocProvider.svelte";

  const domdoc = getDomdoc();
  const snapshotStore = domdoc.snapshot;
  const snapshot = $derived($snapshotStore);
  const document = $derived(snapshot?.document ?? null);
</script>

<p data-slot="page-status" class="flex max-w-48 items-center gap-1 truncate text-xs text-muted-foreground">
  {#if document}
    <span class="truncate">{document.name ?? "Untitled"}</span>
    <span class="shrink-0">· {document.pageCount} {document.pageCount === 1 ? "page" : "pages"}</span>
  {:else}
    <span>No document</span>
  {/if}
</p>
