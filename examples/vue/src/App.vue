<script setup lang="ts">
import { ref } from "vue";
import { bundlesFromCdn, type DomdocViewer as Viewer } from "@domdoc/core";
import { DomdocViewer } from "@domdoc/vue";
import DomdocProvider from "@/components/domdoc/DomdocProvider.vue";
import Toolbar from "@/components/domdoc/Toolbar.vue";
import ViewerShell from "@/components/domdoc/ViewerShell.vue";

const bundles = import.meta.env.DOMDOC_EXAMPLES_BUNDLES || "/api/bundles/0.0.1";

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
  <DomdocProvider :viewer="viewer">
    <div class="flex h-dvh flex-col bg-background font-sans text-foreground">
      <Toolbar />
      <ViewerShell class="min-h-0 flex-1">
        <DomdocViewer class="h-full w-full" :options="options" @ready="onReady" />
      </ViewerShell>
    </div>
  </DomdocProvider>
</template>
