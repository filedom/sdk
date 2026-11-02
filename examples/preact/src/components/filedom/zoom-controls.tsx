import type { ComponentChildren } from "preact";
import { ZoomIn, ZoomOut } from "lucide-preact";
import { Button } from "@/components/filedom/button";
import { useAction, useFiledom } from "@/components/filedom/filedom-provider";
import { Tooltip } from "@/components/filedom/tooltip";

function ZoomButton({
  actionId,
  slot,
  label,
  variant = "icon",
  children,
}: {
  actionId: string;
  slot: string;
  label: string;
  variant?: "icon" | "ghost";
  children: ComponentChildren;
}) {
  const action = useAction(actionId);
  if (action.hidden) return null;
  return (
    <Tooltip label={action.title ?? label}>
      <Button
        variant={variant}
        data-slot={slot}
        data-action={actionId}
        disabled={action.disabled}
        title={action.title ?? label}
        aria-label={label}
        onClick={action.run}
      >
        {children}
      </Button>
    </Tooltip>
  );
}

export function ZoomControls() {
  const { snapshot } = useFiledom();
  const reset = useAction("zoomReset");
  const percent = `${Math.round((snapshot?.zoom ?? 1) * 100)}%`;
  return (
    <div data-slot="zoom-controls" className="flex shrink-0 items-center gap-0.5">
      <ZoomButton actionId="zoomOut" slot="zoom-out" label="Zoom out">
        <ZoomOut className="size-4" />
      </ZoomButton>
      {reset.hidden ? null : (
        <Button
          variant="ghost"
          data-slot="zoom-label"
          data-action="zoomReset"
          disabled={reset.disabled}
          title={reset.title ?? "Actual size"}
          aria-label="Actual size"
          className="min-w-14 px-2 tabular-nums"
          onClick={reset.run}
        >
          {percent}
        </Button>
      )}
      <ZoomButton actionId="zoomIn" slot="zoom-in" label="Zoom in">
        <ZoomIn className="size-4" />
      </ZoomButton>
      <ZoomButton actionId="fitWidth" slot="fit-width" label="Fit width" variant="ghost">
        <span className="px-1 text-xs">Width</span>
      </ZoomButton>
      <ZoomButton actionId="fitPage" slot="fit-page" label="Fit page" variant="ghost">
        <span className="px-1 text-xs">Page</span>
      </ZoomButton>
    </div>
  );
}
