<script lang="ts">
  import type { HTMLButtonAttributes } from "svelte/elements";
  import type { Snippet } from "svelte";
  import { cn } from "@/lib/cn";

  type Variant = "default" | "outline" | "ghost" | "icon";

  let {
    variant = "default",
    class: className,
    children,
    ...rest
  }: HTMLButtonAttributes & { variant?: Variant; children?: Snippet } = $props();

  const variants: Record<Variant, string> = {
    default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
    outline: "border border-border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    icon: "size-8 hover:bg-accent hover:text-accent-foreground",
  };
</script>

<button
  data-slot="button"
  {...rest}
  type="button"
  class={cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    className,
  )}
>
  {@render children?.()}
</button>
