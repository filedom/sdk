/** F05 M4: typed toolbar command registry stub (shared shell contract; not authoritative session). */

import type { M2ToolbarCommandKind } from "./m2-toolbar-command-stub.js";

export const M2_TOOLBAR_COMMAND_REGISTRY_FEATURE_ID = "F05" as const;

export type M2ToolbarCommandRegistryEntry = {
  id: M2ToolbarCommandKind;
  label: string;
  /** Demo toolbar element id when wired in packages/demo. */
  domId: string;
  /** Whether dispatch mutates undo depth on success. */
  affectsUndoStack: boolean;
};

export const M2_TOOLBAR_COMMAND_REGISTRY: readonly M2ToolbarCommandRegistryEntry[] = [
  {
    id: "save-stub",
    label: "Save (.domdoc stub)",
    domId: "domdoc-toolbar-save-stub",
    affectsUndoStack: true,
  },
  {
    id: "undo-stub",
    label: "Undo",
    domId: "domdoc-toolbar-undo-stub",
    affectsUndoStack: true,
  },
  {
    id: "redo-stub",
    label: "Redo",
    domId: "domdoc-toolbar-redo-stub",
    affectsUndoStack: true,
  },
] as const;

export function listM2ToolbarCommandRegistry(): readonly M2ToolbarCommandRegistryEntry[] {
  return M2_TOOLBAR_COMMAND_REGISTRY;
}

export function resolveM2ToolbarCommandEntry(
  id: M2ToolbarCommandKind,
): M2ToolbarCommandRegistryEntry | undefined {
  return M2_TOOLBAR_COMMAND_REGISTRY.find((entry) => entry.id === id);
}
