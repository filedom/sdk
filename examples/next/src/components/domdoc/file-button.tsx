"use client";

import { FolderOpen } from "lucide-react";
import { Button } from "@/components/domdoc/button";
import { useAction } from "@/components/domdoc/domdoc-provider";
import { Tooltip } from "@/components/domdoc/tooltip";

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
