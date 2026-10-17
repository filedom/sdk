import { describe, expect, it } from "vitest";
import {
  applyProsemirrorDemoTypingTransaction,
  createProsemirrorDemoDebouncedSaveState,
  flushProsemirrorDemoDebouncedSave,
} from "./prosemirror-demo-debounced-save-stub.js";
import {
  buildDemoDocxZipBytes,
  openDocxProsemirrorDemoSessionSlice,
} from "./docx-prosemirror-demo-session-slice.js";
import { proseMirrorParagraphTexts } from "../formats/docx/docx-prosemirror-projection.js";

const sessionStub = {
  documentId: "demo",
  kind: "flow" as const,
  revisions: {
    committedRevision: 0,
    persistedRevision: 0,
    materializedRevision: 0,
    exportedRevision: 0,
    sharedRevision: null,
    renderedRevision: 0,
  },
};

describe("ProseMirror demo debounced save (M3/F25)", () => {
  it("typing transaction updates doc only; flush patches store and splits receipts", () => {
    let slice = openDocxProsemirrorDemoSessionSlice(buildDemoDocxZipBytes("start"), sessionStub);
    let saveState = createProsemirrorDemoDebouncedSaveState(slice);
    const typed = applyProsemirrorDemoTypingTransaction(slice, saveState, 0, "typing");
    slice = typed.slice;
    saveState = typed.saveState;
    expect(proseMirrorParagraphTexts(slice.doc)[0]).toBe("typing");
    expect(slice.session.revisions.committedRevision).toBe(0);
    expect(saveState.pendingText).toBe("typing");
    const flushed = flushProsemirrorDemoDebouncedSave(slice, saveState);
    slice = flushed.slice;
    expect(flushed.flushed).toBe(true);
    expect(flushed.docxExportBytes).toBeGreaterThan(100);
    expect(slice.session.revisions.committedRevision).toBe(1);
    expect(slice.session.revisions.persistedRevision).toBe(1);
    expect(slice.session.revisions.exportedRevision).toBe(1);
    expect(flushed.saveState.pendingText).toBeNull();
  });
});
