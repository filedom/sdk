<script lang="ts">
import { inject, provide, shallowRef, watch, type InjectionKey, type ShallowRef } from "vue";
import { createViewerStore, type DomdocViewer, type ViewerStore, type ViewerStoreSnapshot } from "@domdoc/core";

export interface CatalogControl {
  show: boolean;
  disabled: boolean;
  title?: string;
}

export interface DomdocContext {
  store: ShallowRef<ViewerStore | null>;
  snapshot: ShallowRef<ViewerStoreSnapshot | null>;
  run: (actionId: string) => void;
}

export const DOMDOC_KEY: InjectionKey<DomdocContext> = Symbol("domdoc");

export function useDomdoc(): DomdocContext {
  const ctx = inject(DOMDOC_KEY);
  if (!ctx) throw new Error("Domdoc components must be used inside <DomdocProvider>.");
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
const props = withDefaults(defineProps<{ viewer?: DomdocViewer | null }>(), { viewer: null });

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

provide(DOMDOC_KEY, { store, snapshot, run });
</script>

<template>
  <slot />
</template>
