<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import type { Snippet } from "svelte";
  import { cn } from "$lib/cn";

  let {
    text = "",
    class: className,
    children,
    ...rest
  }: HTMLAttributes<HTMLSpanElement> & { text?: string; children?: Snippet } = $props();
</script>

<span data-slot="tooltip" {...rest} class={cn("group/tip relative inline-flex", className)}>
  {@render children?.()}
  {#if text}
    <span
      role="tooltip"
      class="pointer-events-none absolute top-full left-1/2 z-50 mt-1.5 -translate-x-1/2 rounded-md border border-border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground opacity-0 shadow-sm transition-opacity group-hover/tip:opacity-100 group-focus-within/tip:opacity-100"
    >
      {text}
    </span>
  {/if}
</span>
