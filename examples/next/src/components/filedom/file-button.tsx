"use client";

import { FolderOpen } from "lucide-react";
import { Button } from "@/components/filedom/button";
import { useAction } from "@/components/filedom/filedom-provider";
import { Tooltip } from "@/components/filedom/tooltip";

export function FileButton() {
  const action = useAction("open");
  if (action.hidden) return null;
  return (
    <Tooltip label={action.title ?? "Open"}>
      <Button
        variant="ghost"
        data-slot="file-button"
        data-action="open"
        disabled={action.disabled}
        title={action.title ?? "Open"}
        aria-label="Open"
        onClick={action.run}
      >
        <FolderOpen className="size-4" />
        Open
      </Button>
    </Tooltip>
  );
}
