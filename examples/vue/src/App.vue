<script setup lang="ts">
import { ref } from "vue";
import { bundlesFromCdn, type FiledomViewer as Viewer } from "@filedom/core";
import { FiledomViewer } from "@filedom/vue";
import FiledomProvider from "@/components/filedom/FiledomProvider.vue";
import Toolbar from "@/components/filedom/Toolbar.vue";
import ViewerShell from "@/components/filedom/ViewerShell.vue";

const bundles = import.meta.env.FILEDOM_EXAMPLES_BUNDLES || "/api/bundles/0.0.1";

const options = {
  toolbar: false,
  bundles: bundlesFromCdn(bundles),
  fontsWasmBase: `${bundles.replace(/\/$/, "")}/fonts/`,
};

const viewer = ref<Viewer | null>(null);

function onReady(next: Viewer) {
  viewer.value = next;
}
</script>

<template>
  <FiledomProvider :viewer="viewer">
    <div class="flex h-dvh flex-col bg-background font-sans text-foreground">
      <Toolbar />
      <ViewerShell class="min-h-0 flex-1">
        <FiledomViewer class="h-full w-full" :options="options" @ready="onReady" />
      </ViewerShell>
    </div>
  </FiledomProvider>
</template>
