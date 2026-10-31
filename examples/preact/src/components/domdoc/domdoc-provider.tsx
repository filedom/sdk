import { createViewerStore, type ViewerStore, type ViewerStoreSnapshot } from "@domdoc/core";
import type { Viewer } from "@domdoc/preact";
import { createContext, type ComponentChildren } from "preact";
import { useSyncExternalStore } from "preact/compat";
import { useCallback, useContext, useEffect, useState } from "preact/hooks";

const Missing = Symbol("domdoc-provider");
const StoreContext = createContext<ViewerStore | null | typeof Missing>(Missing);

export function DomdocProvider({ viewer, children }: { viewer: Viewer | null; children: ComponentChildren }) {
  const [store, setStore] = useState<ViewerStore | null>(null);
  useEffect(() => {
    if (!viewer) {
      setStore(null);
      return;
    }
    const next = createViewerStore(viewer);
    setStore(next);
    return () => next.destroy();
  }, [viewer]);
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

/** Store plus the snapshot the component keeps in sync. `store` is null until the viewer is ready. */
export function useDomdoc(): { store: ViewerStore | null; snapshot: ViewerStoreSnapshot | null } {
  const store = useContext(StoreContext);
  if (store === Missing) throw new Error("Domdoc components must render inside DomdocProvider");
  const subscribe = useCallback((listener: () => void) => (store ? store.subscribe(listener) : () => {}), [store]);
  const getSnapshot = useCallback(() => (store ? store.getSnapshot() : null), [store]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);
  return { store, snapshot };
}

/** Enabled state from the catalog. `run` is for actions that take no arguments. */
export function useAction(actionId: string) {
  const { store, snapshot } = useDomdoc();
  const action = snapshot?.actions[actionId];
  const hidden = action?.availability === "hidden";
  const disabled = !action || action.availability !== "shown";
  const title = action && action.availability !== "shown" ? action.detail : undefined;
  return {
    hidden,
    disabled,
    title,
    run() {
      if (store && !disabled) store.run(actionId);
    },
  };
}
