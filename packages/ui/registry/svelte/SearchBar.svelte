<script lang="ts">
  import { ChevronDown, ChevronUp } from "lucide-svelte";
  import Button from "@/components/filedom/Button.svelte";
  import Input from "@/components/filedom/Input.svelte";
  import Tooltip from "@/components/filedom/Tooltip.svelte";
  import { control, getFiledom } from "@/components/filedom/FiledomProvider.svelte";

  const filedom = getFiledom();
  const snapshotStore = filedom.snapshot;
  const snapshot = $derived($snapshotStore);
  const search = $derived(control(snapshot, "search", "Search"));
  const findPrev = $derived(control(snapshot, "findPrev", "Previous"));
  const findNext = $derived(control(snapshot, "findNext", "Next"));
  const count = $derived(
    snapshot?.search && snapshot.search.hitCount > 0 ? `${snapshot.search.hitIndex + 1}/${snapshot.search.hitCount}` : "0",
  );

  function onSearch(event: Event) {
    if (search.disabled) return;
    filedom.viewer.search((event.currentTarget as HTMLInputElement).value);
  }
</script>

<div data-slot="search-bar" class="flex min-w-0 shrink items-center gap-0.5">
  {#if !search.hidden}
    <Input
      data-slot="search-input"
      data-action="search"
      type="search"
      placeholder="Search"
      aria-label="Search"
      autocomplete="off"
      spellcheck="false"
      class="w-36"
      value={snapshot?.search.query ?? ""}
      disabled={search.disabled}
      title={search.disabled ? search.title : undefined}
      oninput={onSearch}
    />
  {/if}
  <span data-slot="search-count" class="min-w-8 px-1 text-center text-xs text-muted-foreground tabular-nums">{count}</span>
  {#if !findPrev.hidden}
    <Tooltip text={findPrev.title}>
      <Button
        variant="icon"
        data-slot="search-prev"
        data-action="findPrev"
        aria-label="Previous"
        disabled={findPrev.disabled}
        title={findPrev.disabled ? findPrev.title : undefined}
        onclick={() => filedom.run("findPrev")}
      >
        <ChevronUp class="size-4" />
      </Button>
    </Tooltip>
  {/if}
  {#if !findNext.hidden}
    <Tooltip text={findNext.title}>
      <Button
        variant="icon"
        data-slot="search-next"
        data-action="findNext"
        aria-label="Next"
        disabled={findNext.disabled}
        title={findNext.disabled ? findNext.title : undefined}
        onclick={() => filedom.run("findNext")}
      >
        <ChevronDown class="size-4" />
      </Button>
    </Tooltip>
  {/if}
</div>
