"use client";

import type { ReactNode } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/domdoc/button";
import { useAction, useDomdoc } from "@/components/domdoc/domdoc-provider";
import { Tooltip } from "@/components/domdoc/tooltip";

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
  children: ReactNode;
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
  const { snapshot } = useDomdoc();
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
