import type { AdapterModule, OpenedAdapterFile } from "./api.js";
import { extensionOf } from "./variation.js";

const sessions = new WeakMap<object, OpenedAdapterFile>();

export function rememberAdapter(document: object, opened: OpenedAdapterFile): void {
  sessions.set(document, opened);
}

export function adapterForDocument(document: object): OpenedAdapterFile | undefined {
  return sessions.get(document);
}

export function openedFile(
  name: string,
  source: Uint8Array,
  kind: OpenedAdapterFile["kind"],
  partial: Partial<OpenedAdapterFile> = {},
): OpenedAdapterFile {
  return {
    name,
    extension: extensionOf(name),
    kind,
    source,
    ...partial,
  };
}

export function moduleList(modules: readonly AdapterModule[]): AdapterModule[] {
  return [...modules];
}
