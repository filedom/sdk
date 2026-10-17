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
  entries: readonly AfPostEditIncrementalVerdict[];
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
    const inserted = "X";
    const edited =
      pre.slice(0, breakAt) + inserted + pre.slice(breakAt);
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
    verdicts.push({
      entryId: entry.id,
      breakAfterCharIndex: breakAt,
      insertedChar: inserted,
      incrementalEquivalent,
      detail: incrementalEquivalent
        ? "post-edit suffix sketch matches full layout fragments"
        : "post-edit suffix drift vs full layout",
    });
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
): AfPostEditIncrementalEvidence {
  const entries = evaluateAfPostEditSuffixIncrements(
    shapedLayoutJson,
    layoutIncrementalWithPreEdit,
  );
  const allPostEditSuffixBreakpointsEquivalent =
    entries.length > 0 && entries.every((e) => e.incrementalEquivalent);
  return {
    recordedAt: new Date().toISOString(),
    corpusSize: AF_BROWSER_CORPUS.length,
    gateStatus: "not-run",
    allPostEditSuffixBreakpointsEquivalent,
    entries,
    note: "W2-G4-13 post-edit suffix path; gate G4 not-run",
  };
}
