<script setup lang="ts">
import { computed } from "vue";
import { Redo2, Undo2 } from "lucide-vue-next";
import Button from "~/components/filedom/Button.vue";
import FileButton from "~/components/filedom/FileButton.vue";
import ModeSelect from "~/components/filedom/ModeSelect.vue";
import PageStatus from "~/components/filedom/PageStatus.vue";
import SearchBar from "~/components/filedom/SearchBar.vue";
import Separator from "~/components/filedom/Separator.vue";
import ThemeToggle from "~/components/filedom/ThemeToggle.vue";
import Tooltip from "~/components/filedom/Tooltip.vue";
import ZoomControls from "~/components/filedom/ZoomControls.vue";
import { controlFor, useFiledom } from "~/components/filedom/FiledomProvider.vue";

const { snapshot, run } = useFiledom();
const undo = computed(() => controlFor(snapshot.value, "undo"));
const redo = computed(() => controlFor(snapshot.value, "redo"));
</script>

<template>
  <div
    data-slot="toolbar"
    role="toolbar"
    aria-label="Document"
    class="flex h-toolbar shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-card px-2 text-card-foreground shadow-sm"
  >
    <Tooltip v-if="undo.show" :label="undo.title ?? 'Undo'">
      <Button
        variant="icon"
        data-slot="undo"
        data-action="undo"
        aria-label="Undo"
        :disabled="undo.disabled"
        :title="undo.title"
        @click="run('undo')"
      >
        <Undo2 class="size-4" aria-hidden="true" />
      </Button>
    </Tooltip>
    <Tooltip v-if="redo.show" :label="redo.title ?? 'Redo'">
      <Button
        variant="icon"
        data-slot="redo"
        data-action="redo"
        aria-label="Redo"
        :disabled="redo.disabled"
        :title="redo.title"
        @click="run('redo')"
      >
        <Redo2 class="size-4" aria-hidden="true" />
      </Button>
    </Tooltip>
    <Separator orientation="vertical" />
    <FileButton />
    <Separator orientation="vertical" />
    <ZoomControls />
    <Separator orientation="vertical" />
    <SearchBar />
    <div class="ml-auto flex items-center gap-1">
      <ModeSelect />
      <ThemeToggle />
      <PageStatus />
    </div>
  </div>
</template>
