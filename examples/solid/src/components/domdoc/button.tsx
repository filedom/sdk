import { splitProps, type JSX } from "solid-js";
import { cn } from "@/lib/cn";

type Variant = "default" | "outline" | "ghost" | "icon";

const base =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40";

const variants: Record<Variant, string> = {
  default: "h-8 bg-primary px-3 text-primary-foreground shadow-sm hover:bg-primary/90",
  outline: "h-8 border border-input bg-background px-3 hover:bg-accent hover:text-accent-foreground",
  ghost: "h-8 px-2.5 hover:bg-accent hover:text-accent-foreground",
  icon: "size-8 hover:bg-accent hover:text-accent-foreground",
};

export function Button(props: {
  variant?: Variant;
  class?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  title?: string;
  "data-slot"?: string;
  "data-action"?: string;
  "aria-label"?: string;
  onClick?: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>;
  children?: JSX.Element;
}) {
  const [local, rest] = splitProps(props, ["variant", "class", "children", "data-slot", "type"]);
  return (
    <button
      {...rest}
      type={local.type ?? "button"}
      data-slot={local["data-slot"] ?? "button"}
      class={cn(base, variants[local.variant ?? "default"], local.class)}
    >
      {local.children}
    </button>
  );
}
