<script setup lang="ts">
import type { ClassValue } from "clsx";
import { computed, useAttrs } from "vue";
import { cn } from "~/lib/cn";

defineOptions({ inheritAttrs: false });

const model = defineModel<string>({ default: "" });
const attrs = useAttrs();

const slot = computed(() => {
  const value = attrs["data-slot"];
  return typeof value === "string" && value.length > 0 ? value : "select";
});

const classes = computed(() =>
  cn(
    "h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
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
  <select v-bind="forwarded" v-model="model" :data-slot="slot" :class="classes">
    <slot />
  </select>
</template>
