<script setup lang="ts">
import { computed } from "vue";
import { FolderOpen } from "lucide-vue-next";
import Button from "@/components/filedom/Button.vue";
import Tooltip from "@/components/filedom/Tooltip.vue";
import { controlFor, useFiledom } from "@/components/filedom/FiledomProvider.vue";

const { snapshot, run } = useFiledom();
const open = computed(() => controlFor(snapshot.value, "open"));
</script>

<template>
  <Tooltip v-if="open.show" :label="open.title ?? 'Open'">
    <Button
      variant="ghost"
      data-slot="file-button"
      data-action="open"
      aria-label="Open"
      :disabled="open.disabled"
      :title="open.title"
      @click="run('open')"
    >
      <FolderOpen class="size-4" aria-hidden="true" />
      Open
    </Button>
  </Tooltip>
</template>
