<script lang="ts">
  import type { HTMLSelectAttributes } from "svelte/elements";
  import type { Snippet } from "svelte";
  import { cn } from "@/lib/cn";

  let { class: className, children, ...rest }: HTMLSelectAttributes & { children?: Snippet } = $props();
</script>

<select
  data-slot="select"
  {...rest}
  class={cn(
    "flex h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
    className,
  )}
>
  {@render children?.()}
</select>
