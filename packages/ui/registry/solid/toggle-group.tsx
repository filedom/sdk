import type { JSX } from "solid-js";
import { cn } from "@/lib/cn";

export function ToggleGroup(props: { class?: string; children: JSX.Element; "aria-label"?: string }) {
  return (
    <div
      data-slot="toggle-group"
      role="group"
      aria-label={props["aria-label"]}
      class={cn("inline-flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5", props.class)}
    >
      {props.children}
    </div>
  );
}

export function ToggleGroupItem(props: {
  pressed?: boolean;
  class?: string;
  disabled?: boolean;
  children: JSX.Element;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      data-slot="toggle-group-item"
      aria-pressed={props.pressed ? "true" : "false"}
      disabled={props.disabled}
      class={cn(
        "h-8 rounded-sm px-2.5 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-40",
        props.pressed && "bg-accent text-accent-foreground",
        props.class,
      )}
      onClick={() => props.onClick?.()}
    >
      {props.children}
    </button>
  );
}
