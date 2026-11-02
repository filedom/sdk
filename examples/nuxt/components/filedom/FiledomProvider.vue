<script lang="ts">
import { inject, provide, shallowRef, watch, type InjectionKey, type ShallowRef } from "vue";
import { createViewerStore, type FiledomViewer, type ViewerStore, type ViewerStoreSnapshot } from "@filedom/core";

export interface CatalogControl {
  show: boolean;
  disabled: boolean;
  title?: string;
}

export interface FiledomContext {
  store: ShallowRef<ViewerStore | null>;
  snapshot: ShallowRef<ViewerStoreSnapshot | null>;
  run: (actionId: string) => void;
}

export const FILEDOM_KEY: InjectionKey<FiledomContext> = Symbol("filedom");

export function useFiledom(): FiledomContext {
  const ctx = inject(FILEDOM_KEY);
  if (!ctx) throw new Error("Filedom components must be used inside <FiledomProvider>.");
  return ctx;
}

/** Catalog availability for one action. Hidden controls are left out; disabled ones keep `detail` as `title`. */
export function controlFor(snapshot: ViewerStoreSnapshot | null, actionId: string): CatalogControl {
  const action = snapshot?.actions[actionId];
  if (action?.availability === "hidden") return { show: false, disabled: true };
  if (!action || action.availability === "disabled") return { show: true, disabled: true, title: action?.detail };
  return { show: true, disabled: false };
}
</script>

<script setup lang="ts">
const props = withDefaults(defineProps<{ viewer?: FiledomViewer | null }>(), { viewer: null });

const store = shallowRef<ViewerStore | null>(null);
const snapshot = shallowRef<ViewerStoreSnapshot | null>(null);

watch(
  () => props.viewer ?? null,
  (viewer, _previous, onCleanup) => {
    if (!viewer) {
      store.value = null;
      snapshot.value = null;
      return;
    }
    const next = createViewerStore(viewer);
    store.value = next;
    snapshot.value = next.getSnapshot();
    const unsubscribe = next.subscribe(() => {
      snapshot.value = next.getSnapshot();
    });
    onCleanup(() => {
      unsubscribe();
      next.destroy();
    });
  },
  { immediate: true },
);

function run(actionId: string) {
  store.value?.run(actionId);
}

provide(FILEDOM_KEY, { store, snapshot, run });
</script>

<template>
  <slot />
</template>
