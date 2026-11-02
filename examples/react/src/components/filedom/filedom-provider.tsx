import { createViewerStore, type ViewerStore, type ViewerStoreSnapshot } from "@filedom/core";
import type { Viewer } from "@filedom/react";
import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

const Missing = Symbol("filedom-provider");
const StoreContext = createContext<ViewerStore | null | typeof Missing>(Missing);

export function FiledomProvider({ viewer, children }: { viewer: Viewer | null; children: ReactNode }) {
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

/** Store plus the snapshot React keeps in sync. `store` is null until the viewer is ready. */
export function useFiledom(): { store: ViewerStore | null; snapshot: ViewerStoreSnapshot | null } {
  const store = useContext(StoreContext);
  if (store === Missing) throw new Error("Filedom components must render inside FiledomProvider");
  const subscribe = useCallback((listener: () => void) => (store ? store.subscribe(listener) : () => {}), [store]);
  const getSnapshot = useCallback(() => (store ? store.getSnapshot() : null), [store]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { store, snapshot };
}

/** Enabled state from the catalog. `run` is for actions that take no arguments. */
export function useAction(actionId: string) {
  const { store, snapshot } = useFiledom();
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
