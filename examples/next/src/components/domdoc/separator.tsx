"use client";

import type { HTMLAttributes } from "react";
import { cn, plainClass, slotName } from "@/lib/cn";

type SeparatorProps = HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical";
};

export function Separator({ className, orientation = "horizontal", ...props }: SeparatorProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      {...props}
      data-slot={slotName(props, "separator")}
      className={cn(orientation === "vertical" ? "mx-1 h-5 w-px shrink-0 bg-border" : "my-1 h-px w-full bg-border", plainClass(className))}
    />
  );
}
