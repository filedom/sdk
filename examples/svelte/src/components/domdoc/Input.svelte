<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";
  import { cn } from "@/lib/cn";

  let { class: className, ...rest }: HTMLInputAttributes = $props();
</script>

<input
  data-slot="input"
  type="text"
  {...rest}
  class={cn(
    "flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
    className,
  )}
/>
