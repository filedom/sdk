import { describe, expect, it } from "vitest";
import { buildDemoDocxZipBytes } from "./docx-prosemirror-demo-session-slice.js";
import { openDocxProsemirrorDemoSessionSlice } from "./docx-prosemirror-demo-session-slice.js";
import { proseMirrorParagraphTexts } from "../formats/docx/docx-prosemirror-projection.js";
import {
  applyProsemirrorDemoEditWithToolbarUndo,
  createProsemirrorDemoToolbarUndoState,
  undoProsemirrorDemoViaToolbar,
} from "./prosemirror-demo-toolbar-undo-bridge.js";

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

describe("ProseMirror demo toolbar undo bridge (F05/F21)", () => {
  it("pushes toolbar undo depth on edit and restores on undo", () => {
    let slice = openDocxProsemirrorDemoSessionSlice(buildDemoDocxZipBytes("start"), sessionStub);
    let undoState = createProsemirrorDemoToolbarUndoState(slice);
    const edited = applyProsemirrorDemoEditWithToolbarUndo(slice, undoState, 0, "edited");
    slice = edited.slice;
    undoState = edited.undoState;
    expect(undoState.toolbarStack.undoDepth).toBe(1);
    expect(proseMirrorParagraphTexts(slice.doc)[0]).toBe("edited");
    const undone = undoProsemirrorDemoViaToolbar(slice, undoState, 0);
    slice = undone.slice;
    undoState = undone.undoState;
    expect(undoState.toolbarStack.redoDepth).toBe(1);
    expect(proseMirrorParagraphTexts(slice.doc)[0]).toBe("start");
  });
});
