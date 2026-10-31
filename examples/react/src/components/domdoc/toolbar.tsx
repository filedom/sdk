import type { ReactNode } from "react";
import { Redo2, Undo2 } from "lucide-react";
import { Button } from "@/components/domdoc/button";
import { useAction } from "@/components/domdoc/domdoc-provider";
import { FileButton } from "@/components/domdoc/file-button";
import { ModeSelect } from "@/components/domdoc/mode-select";
import { PageStatus } from "@/components/domdoc/page-status";
import { SearchBar } from "@/components/domdoc/search-bar";
import { Separator } from "@/components/domdoc/separator";
import { ThemeToggle } from "@/components/domdoc/theme-toggle";
import { Tooltip } from "@/components/domdoc/tooltip";
import { ZoomControls } from "@/components/domdoc/zoom-controls";

function HistoryButton({
  actionId,
  slot,
  label,
  children,
}: {
  actionId: string;
  slot: string;
  label: string;
  children: ReactNode;
}) {
  const action = useAction(actionId);
  if (action.hidden) return null;
  return (
    <Tooltip label={action.title ?? label}>
      <Button
        variant="icon"
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

export function Toolbar() {
  return (
    <div data-slot="toolbar" className="flex h-toolbar shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-background px-2 shadow-sm">
      <FileButton />
      <Separator orientation="vertical" />
      <HistoryButton actionId="undo" slot="undo" label="Undo">
        <Undo2 className="size-4" />
      </HistoryButton>
      <HistoryButton actionId="redo" slot="redo" label="Redo">
        <Redo2 className="size-4" />
      </HistoryButton>
      <Separator orientation="vertical" />
      <ZoomControls />
      <Separator orientation="vertical" />
      <SearchBar />
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <ModeSelect />
        <ThemeToggle />
        <PageStatus />
      </div>
    </div>
  );
}
