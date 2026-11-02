import type { JSX } from "solid-js";
import { cn } from "@/lib/cn";

export function Tooltip(props: { label: string; children: JSX.Element; class?: string }) {
  return (
    <span data-slot="tooltip" class={cn("group relative inline-flex", props.class)}>
      {props.children}
      <span
        role="tooltip"
        class="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-sm ring-1 ring-border group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {props.label}
      </span>
    </span>
  );
}
