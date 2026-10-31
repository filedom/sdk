import type { ViewMode } from "@domdoc/core";
import { useAction, useDomdoc } from "@/components/domdoc/domdoc-provider";
import { Select } from "@/components/domdoc/select";

export function ModeSelect() {
  const api = useDomdoc();
  const live = useAction("live", "Live");
  const track = useAction("track", "Track");
  const view = useAction("view", "View");
  const mode = () => api.snapshot()?.viewMode ?? "live";

  function onChange(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (value === "live" || value === "track" || value === "view") api.store()?.viewer.setViewMode(value as ViewMode);
  }

  return (
    <Select data-slot="mode-select" class="w-[7.5rem]" aria-label="View mode" value={mode()} onChange={onChange}>
      <option value="live" disabled={live().disabled || live().hidden} hidden={live().hidden}>
        Live
      </option>
      <option value="track" disabled={track().disabled || track().hidden} hidden={track().hidden}>
        Track
      </option>
      <option value="view" disabled={view().disabled || view().hidden} hidden={view().hidden}>
        View
      </option>
    </Select>
  );
}
