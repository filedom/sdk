<script setup lang="ts">
import { computed } from "vue";
import { Maximize2, UnfoldHorizontal, ZoomIn, ZoomOut } from "lucide-vue-next";
import Button from "~/components/filedom/Button.vue";
import Tooltip from "~/components/filedom/Tooltip.vue";
import { controlFor, useFiledom } from "~/components/filedom/FiledomProvider.vue";

const { snapshot, run } = useFiledom();
const zoomOut = computed(() => controlFor(snapshot.value, "zoomOut"));
const zoomReset = computed(() => controlFor(snapshot.value, "zoomReset"));
const zoomIn = computed(() => controlFor(snapshot.value, "zoomIn"));
const fitWidth = computed(() => controlFor(snapshot.value, "fitWidth"));
const fitPage = computed(() => controlFor(snapshot.value, "fitPage"));
const percent = computed(() => `${Math.round((snapshot.value?.zoom ?? 1) * 100)}%`);
</script>

<template>
  <div data-slot="zoom-controls" class="flex items-center gap-0.5">
    <Tooltip v-if="zoomOut.show" :label="zoomOut.title ?? 'Zoom out'">
      <Button
        variant="icon"
        data-slot="zoom-out"
        data-action="zoomOut"
        aria-label="Zoom out"
        :disabled="zoomOut.disabled"
        :title="zoomOut.title"
        @click="run('zoomOut')"
      >
        <ZoomOut class="size-4" aria-hidden="true" />
      </Button>
    </Tooltip>
    <Tooltip v-if="zoomReset.show" :label="zoomReset.title ?? 'Actual size'">
      <Button
        variant="ghost"
        data-slot="zoom-label"
        data-action="zoomReset"
        class="w-14 tabular-nums"
        aria-label="Actual size"
        :disabled="zoomReset.disabled"
        :title="zoomReset.title"
        @click="run('zoomReset')"
      >
        {{ percent }}
      </Button>
    </Tooltip>
    <Tooltip v-if="zoomIn.show" :label="zoomIn.title ?? 'Zoom in'">
      <Button
        variant="icon"
        data-slot="zoom-in"
        data-action="zoomIn"
        aria-label="Zoom in"
        :disabled="zoomIn.disabled"
        :title="zoomIn.title"
        @click="run('zoomIn')"
      >
        <ZoomIn class="size-4" aria-hidden="true" />
      </Button>
    </Tooltip>
    <Tooltip v-if="fitWidth.show" :label="fitWidth.title ?? 'Fit width'">
      <Button
        variant="icon"
        data-slot="fit-width"
        data-action="fitWidth"
        aria-label="Fit width"
        :disabled="fitWidth.disabled"
        :title="fitWidth.title"
        @click="run('fitWidth')"
      >
        <UnfoldHorizontal class="size-4" aria-hidden="true" />
      </Button>
    </Tooltip>
    <Tooltip v-if="fitPage.show" :label="fitPage.title ?? 'Fit page'">
      <Button
        variant="icon"
        data-slot="fit-page"
        data-action="fitPage"
        aria-label="Fit page"
        :disabled="fitPage.disabled"
        :title="fitPage.title"
        @click="run('fitPage')"
      >
        <Maximize2 class="size-4" aria-hidden="true" />
      </Button>
    </Tooltip>
  </div>
</template>
