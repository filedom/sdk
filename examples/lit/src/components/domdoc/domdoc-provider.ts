import {
  createViewerStore,
  type DomdocViewer,
  type ViewerOptions,
  type ViewerStore,
  type ViewerStoreSnapshot,
} from "@domdoc/core";

export class DomdocProviderElement extends HTMLElement {
  options: ViewerOptions = { toolbar: false };
  store: ViewerStore | null = null;
  private listeners = new Set<() => void>();
  private unsubscribe: (() => void) | undefined;

  override connectedCallback(): void {
    this.setAttribute("data-domdoc-provider", "");
  }

  override disconnectedCallback(): void {
    this.unsubscribe?.();
    this.store?.destroy();
    this.store = null;
    this.listeners.clear();
  }

  /** Viewer options with `toolbar: false`, so the kit chrome is the only toolbar. */
  viewerOptions(): ViewerOptions {
    return { ...this.options, toolbar: false };
  }

  attach(viewer: DomdocViewer): void {
    if (this.store?.viewer === viewer) return;
    this.unsubscribe?.();
    this.store?.destroy();
    const store = createViewerStore(viewer);
    this.store = store;
    const push = () => {
      syncThemeClass(store.getSnapshot());
      for (const listener of [...this.listeners]) listener();
    };
    push();
    this.unsubscribe = store.subscribe(push);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    listener();
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export function shellState(snapshot: { status: string } | null | undefined): string {
  if (!snapshot) return "empty";
  const notice = (snapshot as { usageNotice?: string | null }).usageNotice;
  if (notice === "blocked") return "blocked";
  return snapshot.status;
}

export function syncThemeClass(snapshot: ViewerStoreSnapshot): void {
  const dark = snapshot.theme === "dark" || snapshot.theme === "high-contrast-dark";
  document.documentElement.classList.toggle("dark", dark);
}

export function domdocProvider(host: HTMLElement): DomdocProviderElement | null {
  const found = host.closest("domdoc-provider");
  return found instanceof DomdocProviderElement ? found : null;
}

export function watchDomdoc(host: HTMLElement, onStore: (snapshot: ViewerStoreSnapshot | null) => void): () => void {
  const provider = domdocProvider(host);
  if (!provider) return () => {};
  return provider.subscribe(() => onStore(provider.store?.getSnapshot() ?? null));
}

/** Catalog availability for one control. A disabled control's title is the unsupported detail. */
export function actionState(snapshot: ViewerStoreSnapshot | null, id: string, label: string) {
  const action = snapshot?.actions[id];
  if (!action) return { hidden: false, disabled: true, title: label };
  if (action.availability === "hidden") return { hidden: true, disabled: true, title: action.detail ?? label };
  if (action.availability === "disabled") return { hidden: false, disabled: true, title: action.detail ?? label };
  return { hidden: false, disabled: false, title: label };
}

if (!customElements.get("domdoc-provider")) customElements.define("domdoc-provider", DomdocProviderElement);
