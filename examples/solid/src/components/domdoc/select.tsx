import { splitProps, type JSX } from "solid-js";
import { cn } from "@/lib/cn";

export function Select(props: {
  class?: string;
  disabled?: boolean;
  title?: string;
  value?: string;
  "data-slot"?: string;
  "aria-label"?: string;
  onChange?: JSX.EventHandlerUnion<HTMLSelectElement, Event>;
  children?: JSX.Element;
}) {
  const [local, rest] = splitProps(props, ["class", "children", "data-slot"]);
  return (
    <select
      {...rest}
      data-slot={local["data-slot"] ?? "select"}
      class={cn(
        "h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
        local.class,
      )}
    >
      {local.children}
    </select>
  );
}
