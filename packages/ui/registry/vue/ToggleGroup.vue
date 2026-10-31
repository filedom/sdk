<script setup lang="ts">
import type { ClassValue } from "clsx";
import { computed, useAttrs } from "vue";
import { cn } from "@/lib/cn";

defineOptions({ inheritAttrs: false });

const model = defineModel<string>({ default: "" });

defineProps<{
  options?: ReadonlyArray<{ value: string; label: string; disabled?: boolean }>;
}>();

const attrs = useAttrs();

const slot = computed(() => {
  const value = attrs["data-slot"];
  return typeof value === "string" && value.length > 0 ? value : "toggle-group";
});

const classes = computed(() =>
  cn("inline-flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5", attrs.class as ClassValue),
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
  <div v-bind="forwarded" role="group" :data-slot="slot" :class="classes">
    <button
      v-for="option in options ?? []"
      :key="option.value"
      type="button"
      data-slot="toggle-group-item"
      :aria-pressed="model === option.value"
      :disabled="option.disabled"
      :class="
        cn(
          'rounded-sm px-2 py-1 text-sm font-medium transition-colors disabled:opacity-40',
          model === option.value ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )
      "
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
    <slot />
  </div>
</template>
