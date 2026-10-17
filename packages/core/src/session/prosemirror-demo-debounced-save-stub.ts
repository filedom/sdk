import type { DocxProsemirrorDemoSessionSlice } from "./docx-prosemirror-demo-session-slice.js";
import {
  applyDemoProsemirrorTextReplace,
  applyDemoProsemirrorTypingReplace,
} from "./docx-prosemirror-demo-session-slice.js";
import { exportDocxFromStoreStub } from "../formats/docx/docx-export-stub.js";
import { proseMirrorParagraphTexts } from "../formats/docx/docx-prosemirror-projection.js";
import {
  recordProsemirrorDemoExportReceiptStub,
  recordProsemirrorDemoPersistReceiptStub,
  revisionReceiptsFromSession,
  type ProsemirrorDemoRevisionReceiptsStub,
} from "./prosemirror-demo-revision-receipts-stub.js";
import { DocumentSession } from "./document-session.js";

/** M3/F25: debounced save boundary between typing transactions and OPC patch. */
export const PROSEMIRROR_DEMO_DEBOUNCED_SAVE_FEATURE_ID = "F25" as const;

export interface ProsemirrorDemoDebouncedSaveState {
  featureId: typeof PROSEMIRROR_DEMO_DEBOUNCED_SAVE_FEATURE_ID;
  pendingParagraphIndex: number | null;
  pendingText: string | null;
  /** Text before the in-flight typing batch (for undo stack on flush). */
  baselineParagraphText: string | null;
  flushGeneration: number;
  lastReceipts: ProsemirrorDemoRevisionReceiptsStub;
}

export function createProsemirrorDemoDebouncedSaveState(
  slice: DocxProsemirrorDemoSessionSlice,
): ProsemirrorDemoDebouncedSaveState {
  return {
    featureId: PROSEMIRROR_DEMO_DEBOUNCED_SAVE_FEATURE_ID,
    pendingParagraphIndex: null,
    pendingText: null,
    baselineParagraphText: null,
    flushGeneration: 0,
    lastReceipts: revisionReceiptsFromSession(slice.session.revisions),
  };
}

export interface ProsemirrorDemoTypingTransactionResult {
  slice: DocxProsemirrorDemoSessionSlice;
  saveState: ProsemirrorDemoDebouncedSaveState;
}

/** Real typing transaction: ProseMirror doc only until debounced flush. */
export function applyProsemirrorDemoTypingTransaction(
  slice: DocxProsemirrorDemoSessionSlice,
  saveState: ProsemirrorDemoDebouncedSaveState,
  paragraphIndex: number,
  newText: string,
): ProsemirrorDemoTypingTransactionResult {
  const current = proseMirrorParagraphTexts(slice.doc)[paragraphIndex] ?? "";
  if (current === newText) {
    return { slice, saveState };
  }
  const baseline =
    saveState.pendingText === null
      ? current
      : (saveState.baselineParagraphText ?? current);
  const nextSlice = applyDemoProsemirrorTypingReplace(slice, paragraphIndex, newText);
  return {
    slice: nextSlice,
    saveState: {
      ...saveState,
      pendingParagraphIndex: paragraphIndex,
      pendingText: newText,
      baselineParagraphText: baseline,
      flushGeneration: saveState.flushGeneration + 1,
    },
  };
}

export interface ProsemirrorDemoDebouncedFlushResult {
  slice: DocxProsemirrorDemoSessionSlice;
  saveState: ProsemirrorDemoDebouncedSaveState;
  flushed: boolean;
  docxExportBytes: number;
}

/** Flush pending typing into DocxStore + session persist receipt; export receipt separate. */
export function flushProsemirrorDemoDebouncedSave(
  slice: DocxProsemirrorDemoSessionSlice,
  saveState: ProsemirrorDemoDebouncedSaveState,
): ProsemirrorDemoDebouncedFlushResult {
  if (saveState.pendingParagraphIndex === null || saveState.pendingText === null) {
    return {
      slice,
      saveState,
      flushed: false,
      docxExportBytes: 0,
    };
  }
  const paragraphIndex = saveState.pendingParagraphIndex;
  const newText = saveState.pendingText;
  let nextSlice = applyDemoProsemirrorTextReplace(slice, paragraphIndex, newText);
  const persistRevisions = recordProsemirrorDemoPersistReceiptStub(nextSlice.session.revisions);
  nextSlice = {
    ...nextSlice,
    session: new DocumentSession({
      ...nextSlice.session.stub,
      revisions: persistRevisions,
    }),
  };
  const exported = exportDocxFromStoreStub(nextSlice.store, nextSlice.session);
  const exportRevisions = recordProsemirrorDemoExportReceiptStub(exported.session.revisions);
  nextSlice = {
    ...nextSlice,
    session: new DocumentSession({
      ...nextSlice.session.stub,
      revisions: exportRevisions,
    }),
  };
  return {
    slice: nextSlice,
    saveState: {
      ...saveState,
      pendingParagraphIndex: null,
      pendingText: null,
      baselineParagraphText: null,
      lastReceipts: revisionReceiptsFromSession(nextSlice.session.revisions),
    },
    flushed: true,
    docxExportBytes: exported.result.zipBytes.length,
  };
}
