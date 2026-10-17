/** F05 M2 demo shell: minimal toolbar command dispatch with undo stack stub (not authoritative session). */

export type M2ToolbarCommandKind = "save-stub" | "undo-stub" | "redo-stub";

export interface M2ToolbarUndoStackStub {
  undoDepth: number;
  redoDepth: number;
  lastCommand: M2ToolbarCommandKind | null;
}

export interface M2ToolbarCommandDispatchResult {
  ok: boolean;
  stack: M2ToolbarUndoStackStub;
  detail?: string;
}

export function createM2ToolbarUndoStackStub(): M2ToolbarUndoStackStub {
  return { undoDepth: 0, redoDepth: 0, lastCommand: null };
}

export function dispatchM2ToolbarCommand(
  stack: M2ToolbarUndoStackStub,
  command: M2ToolbarCommandKind,
): M2ToolbarCommandDispatchResult {
  switch (command) {
    case "save-stub": {
      const next: M2ToolbarUndoStackStub = {
        undoDepth: stack.undoDepth + 1,
        redoDepth: 0,
        lastCommand: command,
      };
      return { ok: true, stack: next };
    }
    case "undo-stub": {
      if (stack.undoDepth <= 0) {
        return { ok: false, stack, detail: "undo-empty" };
      }
      return {
        ok: true,
        stack: {
          undoDepth: stack.undoDepth - 1,
          redoDepth: stack.redoDepth + 1,
          lastCommand: command,
        },
      };
    }
    case "redo-stub": {
      if (stack.redoDepth <= 0) {
        return { ok: false, stack, detail: "redo-empty" };
      }
      return {
        ok: true,
        stack: {
          undoDepth: stack.undoDepth + 1,
          redoDepth: stack.redoDepth - 1,
          lastCommand: command,
        },
      };
    }
    default: {
      const _exhaustive: never = command;
      return { ok: false, stack, detail: String(_exhaustive) };
    }
  }
}
