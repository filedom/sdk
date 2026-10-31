"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn, plainClass, slotName } from "@/lib/cn";

type TooltipProps = HTMLAttributes<HTMLSpanElement> & {
  label: string;
  children?: ReactNode;
};

/** Hover and focus label. The child keeps its own `data-slot`. */
export function Tooltip({ label, className, children, ...props }: TooltipProps) {
  return (
    <span {...props} data-slot={slotName(props, "tooltip")} className={cn("group relative inline-flex", plainClass(className))}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full left-1/2 z-20 mt-1 -translate-x-1/2 rounded-md border border-border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground opacity-0 shadow-sm group-focus-within:opacity-100 group-hover:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
