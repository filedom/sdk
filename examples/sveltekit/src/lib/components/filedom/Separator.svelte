<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "$lib/cn";

  let {
    orientation = "horizontal",
    class: className,
    ...rest
  }: HTMLAttributes<HTMLDivElement> & { orientation?: "horizontal" | "vertical" } = $props();
</script>

<div
  data-slot="separator"
  {...rest}
  role="separator"
  aria-orientation={orientation}
  class={cn("shrink-0 bg-border", orientation === "vertical" ? "mx-0.5 h-4 w-px self-center" : "h-px w-full", className)}
></div>
