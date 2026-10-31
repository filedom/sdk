import { Component, Injectable, inject, signal } from "@angular/core";
import { createViewerStore, type DomdocViewer, type ViewerStore, type ViewerStoreSnapshot } from "@domdoc/core";

export interface CatalogControl {
  hidden: boolean;
  disabled: boolean;
  title: string;
}

/**
 * Availability for one catalog action. A missing snapshot keeps the control
 * disabled. `hidden` controls are omitted. A `disabled` control's title is the
 * store's detail.
 */
export function catalogControl(actions: ViewerStoreSnapshot["actions"] | undefined, id: string, label: string): CatalogControl {
  const action = actions?.[id];
  if (!actions) return { hidden: false, disabled: true, title: label };
  if (!action || action.availability === "hidden") return { hidden: true, disabled: true, title: action?.detail ?? label };
  if (action.availability === "disabled") return { hidden: false, disabled: true, title: action.detail ?? label };
  return { hidden: false, disabled: false, title: label };
}

/** Headless store for one viewer. Provided by `DomdocProvider`. */
@Injectable()
export class DomdocContext {
  private handle: ViewerStore | null = null;
  private stop: (() => void) | null = null;
  private readonly current = signal<ViewerStoreSnapshot | null>(null);
  readonly snapshot = this.current.asReadonly();
  readonly attached = signal(false);

  bind(viewer: DomdocViewer): void {
    this.release();
    const store = createViewerStore(viewer);
    this.handle = store;
    this.current.set(store.getSnapshot());
    this.stop = store.subscribe(() => this.current.set(store.getSnapshot()));
    this.attached.set(true);
  }

  release(): void {
    this.stop?.();
    this.stop = null;
    this.handle?.destroy();
    this.handle = null;
    this.attached.set(false);
    this.current.set(null);
  }

  get store(): ViewerStore {
    if (!this.handle) throw new Error("domdoc viewer is not mounted");
    return this.handle;
  }

  control(id: string, label: string): CatalogControl {
    return catalogControl(this.snapshot()?.actions, id, label);
  }
}

export function injectDomdoc(): DomdocContext {
  return inject(DomdocContext);
}

/** Shares one `createViewerStore` with the blocks nested inside it. */
@Component({
  selector: "domdoc-provider",
  standalone: true,
  providers: [DomdocContext],
  template: `<ng-content />`,
})
export class DomdocProvider {}

/** Notice text when a later store snapshot carries `usageNotice`. */
export function usageNotice(snapshot: ViewerStoreSnapshot | null): string {
  if (!snapshot) return "";
  const notice = (snapshot as { usageNotice?: unknown }).usageNotice;
  if (typeof notice === "string") return notice;
  if (notice && typeof notice === "object" && "detail" in notice && typeof (notice as { detail?: unknown }).detail === "string") {
    return (notice as { detail: string }).detail;
  }
  return "";
}

export function shellState(snapshot: ViewerStoreSnapshot | null): string {
  return snapshot?.status ?? "empty";
}
