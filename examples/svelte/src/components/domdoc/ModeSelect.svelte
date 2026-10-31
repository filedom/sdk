<script lang="ts">
  import Select from "@/components/domdoc/Select.svelte";
  import { control, getDomdoc } from "@/components/domdoc/DomdocProvider.svelte";

  const domdoc = getDomdoc();
  const snapshotStore = domdoc.snapshot;
  const snapshot = $derived($snapshotStore);
  const live = $derived(control(snapshot, "live", "Live"));
  const track = $derived(control(snapshot, "track", "Track changes"));
  const view = $derived(control(snapshot, "view", "View only"));

  function onChange(event: Event) {
    const mode = (event.currentTarget as HTMLSelectElement).value;
    if (mode === "live" || mode === "track" || mode === "view") domdoc.run(mode);
  }
</script>

<Select data-slot="mode-select" aria-label="View mode" class="w-36" value={snapshot?.viewMode ?? "live"} onchange={onChange}>
  <option value="live" data-action="live" disabled={live.disabled} title={live.disabled ? live.title : undefined}>Live</option>
  <option value="track" data-action="track" disabled={track.disabled} title={track.disabled ? track.title : undefined}>Track changes</option>
  <option value="view" data-action="view" disabled={view.disabled} title={view.disabled ? view.title : undefined}>View only</option>
</Select>
