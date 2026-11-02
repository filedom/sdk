<script setup lang="ts">
import type { ClassValue } from "clsx";
import { computed, useAttrs } from "vue";
import { cn } from "@/lib/cn";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    orientation?: "horizontal" | "vertical";
  }>(),
  { orientation: "horizontal" },
);

const attrs = useAttrs();

const slot = computed(() => {
  const value = attrs["data-slot"];
  return typeof value === "string" && value.length > 0 ? value : "separator";
});

const classes = computed(() =>
  cn(
    "shrink-0 bg-border",
    props.orientation === "vertical" ? "mx-1 h-4 w-px self-center" : "my-1 h-px w-full",
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
  <div v-bind="forwarded" role="separator" :aria-orientation="orientation" :data-slot="slot" :class="classes" />
</template>
