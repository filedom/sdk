import { Show } from "solid-js";
import { Redo2, Undo2 } from "lucide-solid";
import { Button } from "@/components/filedom/button";
import { useAction, useFiledom } from "@/components/filedom/filedom-provider";
import { FileButton } from "@/components/filedom/file-button";
import { ModeSelect } from "@/components/filedom/mode-select";
import { PageStatus } from "@/components/filedom/page-status";
import { SearchBar } from "@/components/filedom/search-bar";
import { Separator } from "@/components/filedom/separator";
import { ThemeToggle } from "@/components/filedom/theme-toggle";
import { Tooltip } from "@/components/filedom/tooltip";
import { ZoomControls } from "@/components/filedom/zoom-controls";

export function Toolbar() {
  const api = useFiledom();
  const undo = useAction("undo", "Undo");
  const redo = useAction("redo", "Redo");

  return (
    <div
      data-slot="toolbar"
      role="toolbar"
      aria-label="Document"
      class="flex h-toolbar shrink-0 items-center gap-1 border-b border-border bg-card px-2 text-card-foreground"
    >
      <Show when={!undo().hidden}>
        <Tooltip label={undo().title ?? "Undo"}>
          <Button
            variant="icon"
            data-slot="undo"
            data-action="undo"
            disabled={undo().disabled}
            title={undo().title}
            aria-label="Undo"
            onClick={() => api.store()?.run("undo")}
          >
            <Undo2 size={16} />
          </Button>
        </Tooltip>
      </Show>
      <Show when={!redo().hidden}>
        <Tooltip label={redo().title ?? "Redo"}>
          <Button
            variant="icon"
            data-slot="redo"
            data-action="redo"
            disabled={redo().disabled}
            title={redo().title}
            aria-label="Redo"
            onClick={() => api.store()?.run("redo")}
          >
            <Redo2 size={16} />
          </Button>
        </Tooltip>
      </Show>
      <Separator orientation="vertical" />
      <FileButton />
      <Separator orientation="vertical" />
      <ZoomControls />
      <Separator orientation="vertical" />
      <SearchBar />
      <ModeSelect />
      <div class="min-w-0 flex-1" />
      <PageStatus />
      <ThemeToggle />
    </div>
  );
}
