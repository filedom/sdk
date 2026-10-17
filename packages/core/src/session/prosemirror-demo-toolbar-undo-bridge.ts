import {
  applyDemoProsemirrorTextReplace,
  type DocxProsemirrorDemoSessionSlice,
} from "./docx-prosemirror-demo-session-slice.js";
import { proseMirrorParagraphTexts } from "../formats/docx/docx-prosemirror-projection.js";
import {
  dispatchM2ToolbarCommand,
  type M2ToolbarCommandDispatchResult,
  type M2ToolbarUndoStackStub,
} from "./m2-toolbar-command-stub.js";

/** F05/F21: bind ProseMirror demo edits to M2 toolbar undo stack (stub, not authoritative history). */
export interface ProsemirrorDemoToolbarUndoState {
  toolbarStack: M2ToolbarUndoStackStub;
  paragraphTexts: string[];
}

export function createProsemirrorDemoToolbarUndoState(
  _slice: DocxProsemirrorDemoSessionSlice,
): ProsemirrorDemoToolbarUndoState {
  return {
    toolbarStack: { undoDepth: 0, redoDepth: 0, lastCommand: null },
    paragraphTexts: [],
  };
}

export interface ProsemirrorDemoEditResult {
  slice: DocxProsemirrorDemoSessionSlice;
  undoState: ProsemirrorDemoToolbarUndoState;
  toolbarDispatch: M2ToolbarCommandDispatchResult;
}

export function applyProsemirrorDemoEditWithToolbarUndo(
  slice: DocxProsemirrorDemoSessionSlice,
  undoState: ProsemirrorDemoToolbarUndoState,
  paragraphIndex: number,
  newText: string,
): ProsemirrorDemoEditResult {
  const prior = proseMirrorParagraphTexts(slice.doc)[paragraphIndex] ?? "";
  undoState.paragraphTexts.push(prior);
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
  if (undoState.paragraphTexts.length === 0) {
    const toolbarDispatch = dispatchM2ToolbarCommand(undoState.toolbarStack, "undo-stub");
    undoState.toolbarStack = toolbarDispatch.stack;
    return { slice, undoState, toolbarDispatch };
  }
  const restoreText = undoState.paragraphTexts.pop() ?? "";
  const nextSlice = applyDemoProsemirrorTextReplace(slice, paragraphIndex, restoreText);
  const toolbarDispatch = dispatchM2ToolbarCommand(undoState.toolbarStack, "undo-stub");
  undoState.toolbarStack = toolbarDispatch.stack;
  return { slice: nextSlice, undoState, toolbarDispatch };
}
