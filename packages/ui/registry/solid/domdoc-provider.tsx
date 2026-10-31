import { createContext, createEffect, createSignal, onCleanup, useContext, type Accessor, type JSX } from "solid-js";
import { createViewerStore, type DomdocViewer, type ViewerOptions, type ViewerStore, type ViewerStoreSnapshot } from "@domdoc/core";

export interface DomdocApi {
  /** Viewer options with `toolbar: false` forced, so the kit chrome is the only toolbar. */
  options: Accessor<ViewerOptions>;
  store: Accessor<ViewerStore | null>;
  snapshot: Accessor<ViewerStoreSnapshot | null>;
  attach(viewer: DomdocViewer): void;
}

const DomdocContext = createContext<DomdocApi>();

export function shellState(snapshot: { status: string } | null | undefined): string {
  if (!snapshot) return "empty";
  const notice = (snapshot as { usageNotice?: string | null }).usageNotice;
  if (notice === "blocked") return "blocked";
  return snapshot.status;
}

export function DomdocProvider(props: { options: ViewerOptions; children: JSX.Element }) {
  const [store, setStore] = createSignal<ViewerStore | null>(null);
  const [snapshot, setSnapshot] = createSignal<ViewerStoreSnapshot | null>(null);
  let unsubscribe: (() => void) | undefined;

  const api: DomdocApi = {
    options: () => ({ ...props.options, toolbar: false }),
    store,
    snapshot,
    attach(viewer) {
      unsubscribe?.();
      const previous = store();
      const next = createViewerStore(viewer);
      setStore(next);
      setSnapshot(next.getSnapshot());
      unsubscribe = next.subscribe(() => setSnapshot(next.getSnapshot()));
      previous?.destroy();
    },
  };

  createEffect(() => {
    const theme = snapshot()?.theme;
    if (!theme) return;
    document.documentElement.classList.toggle("dark", theme === "dark" || theme === "high-contrast-dark");
  });

  onCleanup(() => {
    unsubscribe?.();
    store()?.destroy();
  });

  return <DomdocContext.Provider value={api}>{props.children}</DomdocContext.Provider>;
}

export function useDomdoc(): DomdocApi {
  const api = useContext(DomdocContext);
  if (!api) throw new Error("domdoc components must render inside <DomdocProvider>");
  return api;
}

/** Catalog availability for one control. A disabled control's title is the unsupported detail. */
export function useAction(id: string, label: string) {
  const api = useDomdoc();
  return () => {
    const action = api.snapshot()?.actions[id];
    if (!action) return { hidden: false, disabled: true, title: label };
    if (action.availability === "hidden") return { hidden: true, disabled: true, title: action.detail ?? label };
    if (action.availability === "disabled") return { hidden: false, disabled: true, title: action.detail ?? label };
    return { hidden: false, disabled: false, title: label };
  };
}
