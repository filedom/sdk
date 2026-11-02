import type { FiledomDocument } from "./document.js";

/**
 * Enables text editing on the session already opened.
 * The PDF and office bundles include editing; there is no second wasm to fetch.
 */
export async function upgradeLazyEdit(doc: FiledomDocument): Promise<void> {
  doc.attach("edit");
}
