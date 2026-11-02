"use client";

import type { SelectHTMLAttributes } from "react";
import { cn, plainClass, slotName } from "@/lib/cn";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      data-slot={slotName(props, "select")}
      className={cn(
        "h-8 shrink-0 rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        plainClass(className),
      )}
    />
  );
}
