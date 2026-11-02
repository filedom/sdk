<script lang="ts" module>
  import { getContext, setContext } from "svelte";
  import { writable, type Writable } from "svelte/store";
  import {
    createViewerStore,
    type FiledomViewer,
    type ViewerStore,
    type ViewerStoreRunResult,
    type ViewerStoreSnapshot,
  } from "@filedom/core";

  export interface FiledomContext {
    snapshot: Writable<ViewerStoreSnapshot | undefined>;
    /**
     * Runs a catalog action that takes no arguments.
     * `search`, `open` with a file, `setZoom`, and `setTheme` go through `viewer`.
     */
    run(actionId: string): ViewerStoreRunResult;
    readonly viewer: FiledomViewer;
  }

  export interface FiledomBinding {
    snapshot: Writable<ViewerStoreSnapshot | undefined>;
    listener?: (snapshot: ViewerStoreSnapshot) => void;
    /** Subscribes a headless store for this viewer. The returned function detaches it. */
    attach(viewer: FiledomViewer): () => void;
  }

  const KEY = Symbol("filedom");

  export function getFiledom(): FiledomContext {
    const ctx = getContext<FiledomContext>(KEY);
    if (!ctx) throw new Error("filedom blocks must render inside FiledomProvider");
    return ctx;
  }

  /** Shares a `createViewerStore` binding with descendant blocks. Call during component init. */
  export function provideFiledom(): FiledomBinding {
    const snapshot = writable<ViewerStoreSnapshot | undefined>(undefined);
    let current: ViewerStore | null = null;
    const binding: FiledomBinding = {
      snapshot,
      attach(viewer) {
        const next = createViewerStore(viewer);
        current = next;
        const publish = () => {
          const value = next.getSnapshot();
          snapshot.set(value);
          binding.listener?.(value);
        };
        publish();
        const unsubscribe = next.subscribe(publish);
        return () => {
          unsubscribe();
          next.destroy();
          if (current === next) current = null;
        };
      },
    };
    const context: FiledomContext = {
      snapshot,
      run(actionId) {
        if (!current) return { status: "unsupported", detail: "The viewer store is not ready" };
        return current.run(actionId);
      },
      get viewer() {
        if (!current) throw new Error("The viewer store is not ready");
        return current.viewer;
      },
    };
    setContext(KEY, context);
    return binding;
  }

  /** Enabled state for one catalog action. A hidden control is left out; a disabled control's title is the detail. */
  export function control(snapshot: ViewerStoreSnapshot | null | undefined, actionId: string, label: string) {
    const action = snapshot?.actions?.[actionId];
    const disabled = action?.availability !== "shown";
    return {
      hidden: action?.availability === "hidden",
      disabled,
      title: disabled ? (action?.detail ?? label) : label,
    };
  }
</script>

<script lang="ts">
  import type { FiledomViewer, ViewerStoreSnapshot } from "@filedom/core";
  import type { Snippet } from "svelte";

  let {
    viewer,
    onSnapshot,
    children,
  }: {
    viewer: FiledomViewer;
    onSnapshot?: (snapshot: ViewerStoreSnapshot) => void;
    children?: Snippet;
  } = $props();

  const binding = provideFiledom();
  let ready = $state(false);

  // The listener is not a dependency of the store effect, so a new callback does not recreate the viewer store.
  $effect(() => {
    binding.listener = onSnapshot;
  });

  $effect(() => {
    const detach = binding.attach(viewer);
    ready = true;
    return () => {
      detach();
      ready = false;
    };
  });
</script>

{#if ready}
  {@render children?.()}
{/if}
