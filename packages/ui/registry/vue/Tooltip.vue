<script setup lang="ts">
import type { ClassValue } from "clsx";
import { computed, useAttrs } from "vue";
import { cn } from "@/lib/cn";

defineOptions({ inheritAttrs: false });

defineProps<{ label: string }>();

const attrs = useAttrs();

const slot = computed(() => {
  const value = attrs["data-slot"];
  return typeof value === "string" && value.length > 0 ? value : "tooltip";
});

const classes = computed(() => cn("group relative inline-flex", attrs.class as ClassValue));

const forwarded = computed(() => {
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class" || key === "data-slot") continue;
    rest[key] = value;
  }
  return rest;
});
</script>

<template>
  <span v-bind="forwarded" :data-slot="slot" :class="classes">
    <slot />
    <span
      role="tooltip"
      class="pointer-events-none absolute top-full left-1/2 z-30 mt-1 -translate-x-1/2 rounded-md bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground opacity-0 shadow-sm ring-1 ring-border transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
    >
      {{ label }}
    </span>
  </span>
</template>
