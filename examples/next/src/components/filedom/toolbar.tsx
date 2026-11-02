"use client";

import type { ReactNode } from "react";
import { Redo2, Undo2 } from "lucide-react";
import { Button } from "@/components/filedom/button";
import { useAction } from "@/components/filedom/filedom-provider";
import { FileButton } from "@/components/filedom/file-button";
import { ModeSelect } from "@/components/filedom/mode-select";
import { PageStatus } from "@/components/filedom/page-status";
import { SearchBar } from "@/components/filedom/search-bar";
import { Separator } from "@/components/filedom/separator";
import { ThemeToggle } from "@/components/filedom/theme-toggle";
import { Tooltip } from "@/components/filedom/tooltip";
import { ZoomControls } from "@/components/filedom/zoom-controls";

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
