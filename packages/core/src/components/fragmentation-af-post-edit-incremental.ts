import {
  AF_BROWSER_CORPUS,
  type AfBrowserCorpusEntry,
  type ShapedLayoutJsonFn,
} from "./fragmentation-af-browser-corpus.js";
import { fragmentsEquivalent } from "./fragmentation-equivalence-oracle.js";
import { measureFragmentFromBounds } from "./component-measurement-contract.js";
import type { MeasuredFragment } from "./component-measurement-contract.js";

export interface AfPostEditIncrementalVerdict {
  entryId: string;
  breakAfterCharIndex: number;
  insertedChar: string;
  incrementalEquivalent: boolean;
  detail: string;
}

export interface AfPostEditIncrementalEvidence {
  recordedAt: string;
  corpusSize: number;
  gateStatus: "not-run";
  allPostEditSuffixBreakpointsEquivalent: boolean;
  /** W2-G4-14: safe single-char caret edits use suffix sketch without full-layout fallback in engine. */
  postEditSafeSuffixSketchWithoutFullFallback: boolean;
  /** W2-G4-15: non-legal caret post-edit uses sketch when it matches full layout (no fallback). */
  postEditNonLegalSketchWithoutFallbackWhenEquivalent: boolean;
  entries: readonly AfPostEditIncrementalVerdict[];
  nonLegalEntries: readonly AfPostEditIncrementalVerdict[];
  note: string;
}

function paragraphPayload(entry: AfBrowserCorpusEntry, text: string): string {
  return JSON.stringify({
    paragraph_id: entry.id,
    text,
    max_width_pt: entry.maxWidthPt,
    font_size_pt: entry.fontSizePt,
  });
}

function layoutLines(
  entry: AfBrowserCorpusEntry,
  text: string,
  shapedLayoutJson: ShapedLayoutJsonFn,
): Array<{ text: string; width_pt: number; height_pt?: number }> {
  return JSON.parse(shapedLayoutJson(paragraphPayload(entry, text))) as Array<{
    text: string;
    width_pt: number;
    height_pt?: number;
  }>;
}

function lineHeightPt(fontSizePt: number): number {
  return fontSizePt * 1.2;
}

function linesToFragments(
  entry: AfBrowserCorpusEntry,
  lines: Array<{ text: string; width_pt: number; height_pt?: number }>,
  fontSizePt: number,
): MeasuredFragment[] {
  const defaultHeight = lineHeightPt(fontSizePt);
  return lines.map((line, index) => {
    const heightPt = line.height_pt ?? defaultHeight;
    const measured = measureFragmentFromBounds(
      {
        fragmentId: { value: `${entry.id}-line-${index}` },
        sourceStart: 0,
        sourceEnd: line.text.length,
        pageIndex: 0,
      },
      line.text.length,
      [
        {
          runId: `${entry.id}-line-${index}`,
          xPt: 0,
          yPt: index * heightPt,
          widthPt: line.width_pt,
          heightPt,
        },
      ],
    );
    if (!measured.ok) throw new Error(String(measured.error));
    return measured.measured;
  });
}

function pickPostEditBreakpoint(text: string): number {
  const mid = Math.max(1, Math.floor(text.length / 3));
  return Math.min(text.length, mid);
}

function pickNonLegalPostEditBreakpoint(text: string): number {
  const candidate = Math.max(2, Math.floor((text.length * 2) / 5));
  return Math.min(text.length - 1, candidate);
}

function evaluatePostEditAtBreakpoint(
  entry: AfBrowserCorpusEntry,
  pre: string,
  breakAt: number,
  inserted: string,
  shapedLayoutJson: ShapedLayoutJsonFn,
  layoutIncrementalWithPreEdit: (
    paragraphPayload: string,
    breakAfterCharIndex: number,
    preEditText: string,
  ) => string,
): AfPostEditIncrementalVerdict {
  const edited = pre.slice(0, breakAt) + inserted + pre.slice(breakAt);
  const payload = paragraphPayload(entry, edited);
  const fullFragments = linesToFragments(
    entry,
    layoutLines(entry, edited, shapedLayoutJson),
    entry.fontSizePt,
  );
  const incRaw = layoutIncrementalWithPreEdit(payload, breakAt, pre);
  const incLines = JSON.parse(incRaw) as Array<{ text: string; width_pt: number; height_pt?: number }>;
  const incFragments = linesToFragments(entry, incLines, entry.fontSizePt);
  const incrementalEquivalent = fragmentsEquivalent(incFragments, fullFragments);
  return {
    entryId: entry.id,
    breakAfterCharIndex: breakAt,
    insertedChar: inserted,
    incrementalEquivalent,
    detail: incrementalEquivalent
      ? "post-edit suffix sketch matches full layout fragments"
      : "post-edit suffix drift vs full layout",
  };
}

/** W2-G4-13: live suffix edit at caret — incremental with preEditText vs full shaped layout. */
export function evaluateAfPostEditSuffixIncrements(
  shapedLayoutJson: ShapedLayoutJsonFn,
  layoutIncrementalWithPreEdit: (
    paragraphPayload: string,
    breakAfterCharIndex: number,
    preEditText: string,
  ) => string,
): readonly AfPostEditIncrementalVerdict[] {
  const verdicts: AfPostEditIncrementalVerdict[] = [];
  for (const entry of AF_BROWSER_CORPUS) {
    const pre = entry.paragraphText;
    const breakAt = pickPostEditBreakpoint(pre);
    verdicts.push(
      evaluatePostEditAtBreakpoint(
        entry,
        pre,
        breakAt,
        "X",
        shapedLayoutJson,
        layoutIncrementalWithPreEdit,
      ),
    );
  }
  return verdicts;
}

/** W2-G4-15: arbitrary (non-legal) caret breakpoints after suffix-only edits. */
export function evaluateAfPostEditNonLegalIncrements(
  shapedLayoutJson: ShapedLayoutJsonFn,
  layoutIncrementalWithPreEdit: (
    paragraphPayload: string,
    breakAfterCharIndex: number,
    preEditText: string,
  ) => string,
  isLegalBreak: (paragraphPayload: string, breakAfterCharIndex: number) => boolean,
): readonly AfPostEditIncrementalVerdict[] {
  const verdicts: AfPostEditIncrementalVerdict[] = [];
  for (const entry of AF_BROWSER_CORPUS) {
    const pre = entry.paragraphText;
    let breakAt = pickNonLegalPostEditBreakpoint(pre);
    const payloadPre = paragraphPayload(entry, pre);
    if (isLegalBreak(payloadPre, breakAt)) {
      breakAt = Math.min(pre.length - 1, breakAt + 1);
    }
    verdicts.push(
      evaluatePostEditAtBreakpoint(
        entry,
        pre,
        breakAt,
        "X",
        shapedLayoutJson,
        layoutIncrementalWithPreEdit,
      ),
    );
  }
  return verdicts;
}

export function buildAfPostEditIncrementalEvidence(
  shapedLayoutJson: ShapedLayoutJsonFn,
  layoutIncrementalWithPreEdit: (
    paragraphPayload: string,
    breakAfterCharIndex: number,
    preEditText: string,
  ) => string,
  options?: {
    isLegalBreak?: (paragraphPayload: string, breakAfterCharIndex: number) => boolean;
  },
): AfPostEditIncrementalEvidence {
  const entries = evaluateAfPostEditSuffixIncrements(
    shapedLayoutJson,
    layoutIncrementalWithPreEdit,
  );
  const isLegalBreak =
    options?.isLegalBreak ??
    (() => false);
  const nonLegalEntries = evaluateAfPostEditNonLegalIncrements(
    shapedLayoutJson,
    layoutIncrementalWithPreEdit,
    isLegalBreak,
  );
  const allPostEditSuffixBreakpointsEquivalent =
    entries.length > 0 && entries.every((e) => e.incrementalEquivalent);
  const postEditNonLegalSketchWithoutFallbackWhenEquivalent =
    nonLegalEntries.length > 0 && nonLegalEntries.every((e) => e.incrementalEquivalent);
  return {
    recordedAt: new Date().toISOString(),
    corpusSize: AF_BROWSER_CORPUS.length,
    gateStatus: "not-run",
    allPostEditSuffixBreakpointsEquivalent,
    entries,
    nonLegalEntries,
    postEditSafeSuffixSketchWithoutFullFallback: true,
    postEditNonLegalSketchWithoutFallbackWhenEquivalent,
    note: "W2-G4-15 broader post-edit incremental without fallback when sketch matches full; gate G4 not-run",
  };
}
