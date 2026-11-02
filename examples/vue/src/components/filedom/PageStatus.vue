<script setup lang="ts">
import { computed } from "vue";
import { useFiledom } from "@/components/filedom/FiledomProvider.vue";

const { snapshot } = useFiledom();
const label = computed(() => {
  const doc = snapshot.value?.document;
  if (!doc) return "No document";
  const name = doc.name?.trim() || "Untitled";
  const pages = `${doc.pageCount} ${doc.pageCount === 1 ? "page" : "pages"}`;
  return `${name} · ${pages}`;
});
</script>

<template>
  <span data-slot="page-status" class="max-w-48 truncate px-1 text-xs text-muted-foreground" :title="label">
    {{ label }}
  </span>
</template>
