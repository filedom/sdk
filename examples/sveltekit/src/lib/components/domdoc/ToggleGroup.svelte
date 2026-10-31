<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import type { Snippet } from "svelte";
  import { cn } from "$lib/cn";

  interface Item {
    value: string;
    label: string;
    disabled?: boolean;
  }

  let {
    value = "",
    items = [],
    onValue,
    class: className,
    children,
    ...rest
  }: HTMLAttributes<HTMLDivElement> & {
    value?: string;
    items?: Item[];
    onValue?: (value: string) => void;
    children?: Snippet;
  } = $props();
</script>

<div
  data-slot="toggle-group"
  role="group"
  {...rest}
  class={cn("inline-flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5", className)}
>
  {#each items as item (item.value)}
    <button
      type="button"
      data-slot="toggle-group-item"
      aria-pressed={value === item.value}
      disabled={item.disabled}
      class={cn(
        "inline-flex h-7 items-center rounded-sm px-2 text-sm font-medium text-foreground hover:bg-accent disabled:pointer-events-none disabled:opacity-50",
        value === item.value && "bg-accent text-accent-foreground",
      )}
      onclick={() => onValue?.(item.value)}
    >
      {item.label}
    </button>
  {/each}
  {@render children?.()}
</div>
