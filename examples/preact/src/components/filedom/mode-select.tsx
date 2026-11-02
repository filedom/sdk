import { useAction, useFiledom } from "@/components/filedom/filedom-provider";
import { Select } from "@/components/filedom/select";

const MODES = ["live", "track", "view"] as const;

export function ModeSelect() {
  const { store, snapshot } = useFiledom();
  const live = useAction("live");
  const track = useAction("track");
  const view = useAction("view");
  const actions = { live, track, view };
  return (
    <Select
      data-slot="mode-select"
      aria-label="View mode"
      value={snapshot?.viewMode ?? "live"}
      onChange={(event) => {
        const mode = event.currentTarget.value;
        if (mode === "live" || mode === "track" || mode === "view") store?.run(mode);
      }}
    >
      {MODES.map((mode) => (
        <option key={mode} value={mode} data-action={mode} disabled={actions[mode].disabled} title={actions[mode].title}>
          {mode === "live" ? "Live" : mode === "track" ? "Track changes" : "View only"}
        </option>
      ))}
    </Select>
  );
}
