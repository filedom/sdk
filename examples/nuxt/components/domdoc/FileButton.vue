<script setup lang="ts">
import { computed } from "vue";
import { FolderOpen } from "lucide-vue-next";
import Button from "~/components/domdoc/Button.vue";
import Tooltip from "~/components/domdoc/Tooltip.vue";
import { controlFor, useDomdoc } from "~/components/domdoc/DomdocProvider.vue";

const { snapshot, run } = useDomdoc();
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
