import {
  AF_BROWSER_CORPUS,
  type AfBrowserCorpusEntry,
  type ShapedLayoutJsonFn,
} from "./fragmentation-af-browser-corpus.js";
import {
  evaluatePostEditAtBreakpoint,
  type AfPostEditIncrementalVerdict,
} from "./fragmentation-af-post-edit-incremental.js";

/** W2-G4-16: scaled post-edit incremental oracle — multiple caret breakpoints per AF entry. */
export interface AfPostEditGateGradeScaleEntry {
  entryId: string;
  breakpointCount: number;
  allEquivalent: boolean;
  verdicts: readonly AfPostEditIncrementalVerdict[];
}

export interface AfPostEditGateGradeScaleEvidence {
  recordedAt: string;
  corpusSize: number;
  breakpointsPerEntry: number;
  gateStatus: "not-run";
  scaledPostEditAllEquivalent: boolean;
  entries: readonly AfPostEditGateGradeScaleEntry[];
  note: string;
}

function scaledBreakpoints(text: string, count: number): number[] {
  const indices: number[] = [];
  for (let i = 1; i <= count; i++) {
    const at = Math.min(text.length - 1, Math.max(1, Math.floor((text.length * i) / (count + 1))));
    if (!indices.includes(at)) indices.push(at);
  }
  return indices.length > 0 ? indices : [Math.max(1, Math.floor(text.length / 2))];
}

export function evaluateAfPostEditGateGradeScale(
  shapedLayoutJson: ShapedLayoutJsonFn,
  layoutIncrementalWithPreEdit: (
    paragraphPayload: string,
    breakAfterCharIndex: number,
    preEditText: string,
  ) => string,
  options?: { breakpointsPerEntry?: number },
): readonly AfPostEditGateGradeScaleEntry[] {
  const breakpointsPerEntry = options?.breakpointsPerEntry ?? 3;
  return AF_BROWSER_CORPUS.map((entry: AfBrowserCorpusEntry) => {
    const pre = entry.paragraphText;
    const verdicts = scaledBreakpoints(pre, breakpointsPerEntry).map((breakAt) =>
      evaluatePostEditAtBreakpoint(
        entry,
        pre,
        breakAt,
        "X",
        shapedLayoutJson,
        layoutIncrementalWithPreEdit,
      ),
    );
    return {
      entryId: entry.id,
      breakpointCount: verdicts.length,
      allEquivalent: verdicts.every((v) => v.incrementalEquivalent),
      verdicts,
    };
  });
}

export function buildAfPostEditGateGradeScaleEvidence(
  shapedLayoutJson: ShapedLayoutJsonFn,
  layoutIncrementalWithPreEdit: (
    paragraphPayload: string,
    breakAfterCharIndex: number,
    preEditText: string,
  ) => string,
  options?: { breakpointsPerEntry?: number },
): AfPostEditGateGradeScaleEvidence {
  const breakpointsPerEntry = options?.breakpointsPerEntry ?? 3;
  const entries = evaluateAfPostEditGateGradeScale(
    shapedLayoutJson,
    layoutIncrementalWithPreEdit,
    { breakpointsPerEntry },
  );
  const scaledPostEditAllEquivalent =
    entries.length > 0 && entries.every((e) => e.allEquivalent);
  return {
    recordedAt: new Date().toISOString(),
    corpusSize: AF_BROWSER_CORPUS.length,
    breakpointsPerEntry,
    gateStatus: "not-run",
    scaledPostEditAllEquivalent,
    entries,
    note: "W2-G4-16 gate-grade post-edit incremental scale; G4 gate proof still not-run",
  };
}
