<script setup lang="ts">
import type { ClassValue } from "clsx";
import { computed, useAttrs } from "vue";
import { cn } from "~/lib/cn";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    variant?: "default" | "outline" | "ghost" | "icon";
  }>(),
  { variant: "default" },
);

const attrs = useAttrs();

const VARIANT = {
  default: "h-8 bg-primary px-2.5 text-primary-foreground shadow-sm hover:bg-primary/90",
  outline: "h-8 border border-border bg-background px-2.5 shadow-sm hover:bg-accent hover:text-accent-foreground",
  ghost: "h-8 px-2.5 hover:bg-accent hover:text-accent-foreground",
  icon: "size-8 hover:bg-accent hover:text-accent-foreground",
} as const;

const slot = computed(() => {
  const value = attrs["data-slot"];
  return typeof value === "string" && value.length > 0 ? value : "button";
});

const classes = computed(() =>
  cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md text-sm font-medium whitespace-nowrap text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
    VARIANT[props.variant],
    attrs.class as ClassValue,
  ),
);

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
  <button v-bind="forwarded" type="button" :data-slot="slot" :class="classes">
    <slot />
  </button>
</template>
