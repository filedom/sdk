import { Show } from "solid-js";
import { Expand, UnfoldHorizontal, ZoomIn, ZoomOut } from "lucide-solid";
import { Button } from "@/components/filedom/button";
import { useAction, useFiledom } from "@/components/filedom/filedom-provider";
import { Separator } from "@/components/filedom/separator";
import { Tooltip } from "@/components/filedom/tooltip";

export function ZoomControls() {
  const api = useFiledom();
  const zoomOut = useAction("zoomOut", "Zoom out");
  const zoomReset = useAction("zoomReset", "Actual size");
  const zoomIn = useAction("zoomIn", "Zoom in");
  const fitWidth = useAction("fitWidth", "Fit width");
  const fitPage = useAction("fitPage", "Fit page");
  const percent = () => `${Math.round((api.snapshot()?.zoom ?? 1) * 100)}%`;

  return (
    <div data-slot="zoom-controls" class="flex items-center gap-0.5">
      <Show when={!zoomOut().hidden}>
        <Tooltip label={zoomOut().title ?? "Zoom out"}>
          <Button
            variant="icon"
            data-slot="zoom-out"
            data-action="zoomOut"
            disabled={zoomOut().disabled}
            title={zoomOut().title}
            aria-label="Zoom out"
            onClick={() => api.store()?.run("zoomOut")}
          >
            <ZoomOut size={16} />
          </Button>
        </Tooltip>
      </Show>
      <Show when={!zoomReset().hidden}>
        <Button
          variant="ghost"
          data-slot="zoom-label"
          data-action="zoomReset"
          disabled={zoomReset().disabled}
          title={zoomReset().title}
          class="h-8 min-w-14 px-2 text-xs tabular-nums"
          onClick={() => api.store()?.viewer.setZoom(1)}
        >
          {percent()}
        </Button>
      </Show>
      <Show when={!zoomIn().hidden}>
        <Tooltip label={zoomIn().title ?? "Zoom in"}>
          <Button
            variant="icon"
            data-slot="zoom-in"
            data-action="zoomIn"
            disabled={zoomIn().disabled}
            title={zoomIn().title}
            aria-label="Zoom in"
            onClick={() => api.store()?.run("zoomIn")}
          >
            <ZoomIn size={16} />
          </Button>
        </Tooltip>
      </Show>
      <Separator orientation="vertical" />
      <Show when={!fitWidth().hidden}>
        <Tooltip label={fitWidth().title ?? "Fit width"}>
          <Button
            variant="icon"
            data-slot="fit-width"
            data-action="fitWidth"
            disabled={fitWidth().disabled}
            title={fitWidth().title}
            aria-label="Fit width"
            onClick={() => api.store()?.run("fitWidth")}
          >
            <UnfoldHorizontal size={16} />
          </Button>
        </Tooltip>
      </Show>
      <Show when={!fitPage().hidden}>
        <Tooltip label={fitPage().title ?? "Fit page"}>
          <Button
            variant="icon"
            data-slot="fit-page"
            data-action="fitPage"
            disabled={fitPage().disabled}
            title={fitPage().title}
            aria-label="Fit page"
            onClick={() => api.store()?.run("fitPage")}
          >
            <Expand size={16} />
          </Button>
        </Tooltip>
      </Show>
    </div>
  );
}
