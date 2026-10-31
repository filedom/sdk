<script setup lang="ts">
import { computed, watch } from "vue";
import { Moon, Sun } from "lucide-vue-next";
import Button from "~/components/domdoc/Button.vue";
import Tooltip from "~/components/domdoc/Tooltip.vue";
import { controlFor, useDomdoc } from "~/components/domdoc/DomdocProvider.vue";

const { snapshot, store } = useDomdoc();
const theme = computed(() => controlFor(snapshot.value, "theme"));
const dark = computed(() => {
  const name = snapshot.value?.theme;
  return name === "dark" || name === "high-contrast-dark";
});

function applyPageClass(isDark: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", isDark);
}

watch(dark, (isDark) => applyPageClass(isDark), { immediate: true });

function toggle() {
  if (!store.value || theme.value.disabled) return;
  const next = dark.value ? "light" : "dark";
  applyPageClass(next === "dark");
  store.value.viewer.setTheme(next);
}
</script>

<template>
  <Tooltip v-if="theme.show" :label="theme.title ?? (dark ? 'Switch to light' : 'Switch to dark')">
    <Button
      variant="icon"
      data-slot="theme-toggle"
      data-action="theme"
      :aria-label="dark ? 'Switch to light' : 'Switch to dark'"
      :disabled="theme.disabled"
      :title="theme.title"
      @click="toggle"
    >
      <Sun v-if="dark" class="size-4" aria-hidden="true" />
      <Moon v-else class="size-4" aria-hidden="true" />
    </Button>
  </Tooltip>
</template>
