import { splitProps, type JSX } from "solid-js";
import { cn } from "@/lib/cn";

export function Input(props: {
  class?: string;
  type?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  title?: string;
  "data-slot"?: string;
  "data-action"?: string;
  "aria-label"?: string;
  onInput?: JSX.EventHandlerUnion<HTMLInputElement, InputEvent>;
  onKeyDown?: JSX.EventHandlerUnion<HTMLInputElement, KeyboardEvent>;
}) {
  const [local, rest] = splitProps(props, ["class", "data-slot"]);
  return (
    <input
      {...rest}
      data-slot={local["data-slot"] ?? "input"}
      class={cn(
        "h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
        local.class,
      )}
    />
  );
}
