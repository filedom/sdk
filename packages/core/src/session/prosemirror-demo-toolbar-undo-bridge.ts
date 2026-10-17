import type { DocxProsemirrorDemoSessionSlice } from "./docx-prosemirror-demo-session-slice.js";
import { applyDemoProsemirrorTextReplace } from "./docx-prosemirror-demo-session-slice.js";
import { proseMirrorParagraphTexts } from "../formats/docx/docx-prosemirror-projection.js";
import {
  dispatchM2ToolbarCommand,
  type M2ToolbarCommandDispatchResult,
  type M2ToolbarUndoStackStub,
} from "./m2-toolbar-command-stub.js";
import type { ProsemirrorDemoRevisionReceiptsStub } from "./prosemirror-demo-revision-receipts-stub.js";
import {
  flushProsemirrorDemoDebouncedSave,
  type ProsemirrorDemoDebouncedSaveState,
} from "./prosemirror-demo-debounced-save-stub.js";
import { revisionReceiptsFromSession } from "./prosemirror-demo-revision-receipts-stub.js";

/** F05/F21: bind ProseMirror demo edits to M2 toolbar undo stack (stub, not authoritative history). */
export interface ProsemirrorDemoToolbarUndoEntry {
  paragraphText: string;
  receipts: ProsemirrorDemoRevisionReceiptsStub;
}

export interface ProsemirrorDemoToolbarUndoState {
  toolbarStack: M2ToolbarUndoStackStub;
  undoEntries: ProsemirrorDemoToolbarUndoEntry[];
}

export function createProsemirrorDemoToolbarUndoState(
  _slice: DocxProsemirrorDemoSessionSlice,
): ProsemirrorDemoToolbarUndoState {
  return {
    toolbarStack: { undoDepth: 0, redoDepth: 0, lastCommand: null },
    undoEntries: [],
  };
}

export interface ProsemirrorDemoEditResult {
  slice: DocxProsemirrorDemoSessionSlice;
  undoState: ProsemirrorDemoToolbarUndoState;
  toolbarDispatch: M2ToolbarCommandDispatchResult;
}

export interface ProsemirrorDemoDebouncedFlushWithUndoResult extends ProsemirrorDemoEditResult {
  saveState: ProsemirrorDemoDebouncedSaveState;
  docxExportBytes: number;
}

/** Push undo entry and flush debounced typing into store + §13 receipt stubs. */
export function flushProsemirrorDemoDebouncedSaveWithToolbarUndo(
  slice: DocxProsemirrorDemoSessionSlice,
  undoState: ProsemirrorDemoToolbarUndoState,
  saveState: ProsemirrorDemoDebouncedSaveState,
  paragraphIndex: number,
): ProsemirrorDemoDebouncedFlushWithUndoResult {
  const prior =
    saveState.baselineParagraphText ??
    proseMirrorParagraphTexts(slice.doc)[paragraphIndex] ??
    "";
  undoState.undoEntries.push({
    paragraphText: prior,
    receipts: revisionReceiptsFromSession(slice.session.revisions),
  });
  const toolbarDispatch = dispatchM2ToolbarCommand(undoState.toolbarStack, "save-stub");
  undoState.toolbarStack = toolbarDispatch.stack;
  const flushed = flushProsemirrorDemoDebouncedSave(slice, saveState);
  return {
    slice: flushed.slice,
    undoState,
    toolbarDispatch,
    saveState: flushed.saveState,
    docxExportBytes: flushed.docxExportBytes,
  };
}

/** Immediate edit path (tests / legacy change handler). */
export function applyProsemirrorDemoEditWithToolbarUndo(
  slice: DocxProsemirrorDemoSessionSlice,
  undoState: ProsemirrorDemoToolbarUndoState,
  paragraphIndex: number,
  newText: string,
): ProsemirrorDemoEditResult {
  const prior = proseMirrorParagraphTexts(slice.doc)[paragraphIndex] ?? "";
  undoState.undoEntries.push({
    paragraphText: prior,
    receipts: revisionReceiptsFromSession(slice.session.revisions),
  });
  const toolbarDispatch = dispatchM2ToolbarCommand(undoState.toolbarStack, "save-stub");
  undoState.toolbarStack = toolbarDispatch.stack;
  const nextSlice = applyDemoProsemirrorTextReplace(slice, paragraphIndex, newText);
  return { slice: nextSlice, undoState, toolbarDispatch };
}

export interface ProsemirrorDemoToolbarUndoResult {
  slice: DocxProsemirrorDemoSessionSlice;
  undoState: ProsemirrorDemoToolbarUndoState;
  toolbarDispatch: M2ToolbarCommandDispatchResult;
}

export function undoProsemirrorDemoViaToolbar(
  slice: DocxProsemirrorDemoSessionSlice,
  undoState: ProsemirrorDemoToolbarUndoState,
  paragraphIndex: number,
): ProsemirrorDemoToolbarUndoResult {
  if (undoState.undoEntries.length === 0) {
    const toolbarDispatch = dispatchM2ToolbarCommand(undoState.toolbarStack, "undo-stub");
    undoState.toolbarStack = toolbarDispatch.stack;
    return { slice, undoState, toolbarDispatch };
  }
  const entry = undoState.undoEntries.pop();
  const restoreText = entry?.paragraphText ?? "";
  const nextSlice = applyDemoProsemirrorTextReplace(slice, paragraphIndex, restoreText);
  const toolbarDispatch = dispatchM2ToolbarCommand(undoState.toolbarStack, "undo-stub");
  undoState.toolbarStack = toolbarDispatch.stack;
  return { slice: nextSlice, undoState, toolbarDispatch };
}
