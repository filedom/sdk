<script setup lang="ts">
import { computed, ref } from "vue";
import type { ViewerStoreSnapshot } from "@domdoc/core";
import { FileUp } from "lucide-vue-next";
import Button from "@/components/domdoc/Button.vue";
import { useDomdoc } from "@/components/domdoc/DomdocProvider.vue";

const SAMPLE_PDF = "/sdk-docs/samples/hello.pdf";

const { store, snapshot } = useDomdoc();
const dragging = ref(false);
const opening = ref(false);
const sampleError = ref("");
let dragDepth = 0;

type UsageNotice = "trial" | "blocked";

function usageOf(snap: ViewerStoreSnapshot | null): UsageNotice | null {
  if (!snap) return null;
  const notice = (snap as ViewerStoreSnapshot & { usageNotice?: unknown }).usageNotice;
  if (notice === "blocked" || snap.error?.code === "usage-blocked") return "blocked";
  if (notice === "trial") return "trial";
  return null;
}

const usageNotice = computed(() => usageOf(snapshot.value));

const state = computed(() => {
  if (usageNotice.value === "blocked") return "blocked";
  const status = snapshot.value?.status;
  if (status === "loading" || status === "ready" || status === "error") return status;
  return "empty";
});

const showEmpty = computed(() => state.value === "empty" || state.value === "error");

function onDragEnter() {
  dragDepth += 1;
  dragging.value = true;
}

function onDragLeave() {
  dragDepth -= 1;
  if (dragDepth <= 0) {
    dragDepth = 0;
    dragging.value = false;
  }
}

function onDrop(event: DragEvent) {
  dragDepth = 0;
  dragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (!file || !store.value) return;
  sampleError.value = "";
  void store.value.viewer.open(file).catch(() => {
    // The store records the viewer error on the shell.
  });
}

async function openSample() {
  const viewer = store.value?.viewer;
  if (!viewer || opening.value) return;
  opening.value = true;
  sampleError.value = "";
  try {
    const response = await fetch(SAMPLE_PDF);
    if (!response.ok) {
      sampleError.value = `Could not fetch the sample (${response.status}).`;
      return;
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    await viewer.open(bytes, { name: "hello.pdf" });
  } catch {
    // The store records the viewer error on the shell.
  } finally {
    opening.value = false;
  }
}
</script>

<template>
  <div
    data-slot="viewer-shell"
    class="relative flex min-h-0 w-full flex-1 flex-col bg-canvas text-foreground"
    :data-domdoc-state="state"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div
      v-show="usageNotice"
      data-slot="usage-notice"
      :data-state="usageNotice || undefined"
      :class="
        usageNotice === 'blocked'
          ? 'flex min-h-0 flex-1 items-center justify-center bg-canvas p-6'
          : 'pointer-events-none shrink-0 border-b border-border bg-muted px-3 py-1 text-center text-xs text-muted-foreground'
      "
    >
      <div v-if="usageNotice === 'blocked'" class="max-w-md rounded-lg border border-border bg-card px-8 py-10 text-center shadow-sm">
        <p class="text-sm font-medium text-foreground">{{ snapshot?.error?.detail || "domdoc is blocked for this site." }}</p>
        <p class="mt-1 text-sm text-muted-foreground">The document stays closed.</p>
      </div>
      <template v-else>Trial: unlicensed domdoc</template>
    </div>

    <div v-show="state !== 'blocked'" data-slot="viewer-canvas" class="relative flex min-h-0 flex-1 flex-col">
      <slot />
      <div v-if="showEmpty" data-slot="empty-state" class="absolute inset-0 z-10 flex items-center justify-center bg-canvas p-6">
        <div
          data-slot="dropzone"
          class="flex w-full max-w-md flex-col items-center gap-3 rounded-lg border border-dashed bg-card px-8 py-10 text-center shadow-sm"
          :class="dragging ? 'border-primary bg-accent' : 'border-border'"
        >
          <FileUp class="size-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p class="text-sm font-medium text-foreground">Drop a document here</p>
            <p class="mt-1 text-sm text-muted-foreground">PDF and office files open in the viewer.</p>
          </div>
          <Button data-slot="open-sample" :disabled="!store || opening" @click="openSample">Open sample</Button>
          <p v-if="sampleError" class="text-sm text-destructive">{{ sampleError }}</p>
          <p v-else-if="state === 'error' && snapshot?.error" class="text-sm text-destructive">{{ snapshot.error.detail }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
