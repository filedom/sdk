import {
  AF_BROWSER_CORPUS,
  type AfBrowserCorpusEntry,
  type ShapedLayoutJsonFn,
} from "./fragmentation-af-browser-corpus.js";
import { fragmentsEquivalent } from "./fragmentation-equivalence-oracle.js";
import { measureFragmentFromBounds } from "./component-measurement-contract.js";
import type { MeasuredFragment } from "./component-measurement-contract.js";

export type AfEditBreakpointKind = "legal" | "arbitrary";

export interface AfEditBreakpointVerdict {
  entryId: string;
  breakAfterCharIndex: number;
  breakpointKind: AfEditBreakpointKind;
  incrementalEquivalent: boolean;
  detail: string;
}

export interface AfEditBreakpointEvidence {
  recordedAt: string;
  corpusSize: number;
  gateStatus: "not-run";
  allLegalBreakpointsEquivalent: boolean;
  arbitraryBreakpointsRecorded: number;
  entries: readonly AfEditBreakpointVerdict[];
  note: string;
}

function paragraphPayload(entry: AfBrowserCorpusEntry): string {
  return JSON.stringify({
    paragraph_id: entry.id,
    text: entry.paragraphText,
    max_width_pt: entry.maxWidthPt,
    font_size_pt: entry.fontSizePt,
  });
}

function layoutLines(
  entry: AfBrowserCorpusEntry,
  shapedLayoutJson: ShapedLayoutJsonFn,
): Array<{ text: string; width_pt: number; height_pt?: number }> {
  return JSON.parse(shapedLayoutJson(paragraphPayload(entry))) as Array<{
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

function pickArbitraryBreakpoint(text: string, legal: readonly number[]): number {
  const mid = Math.max(1, Math.floor(text.length / 3));
  if (legal.includes(mid)) {
    return Math.min(text.length - 1, mid + 1);
  }
  return mid;
}

/** W2-G4-11: incremental layout at each legal break + one arbitrary edit breakpoint per AF entry. */
export function evaluateAfEngineIncrementalAtEditBreakpoints(
  shapedLayoutJson: ShapedLayoutJsonFn,
  layoutIncrementalAtBreak: (paragraphPayload: string, breakAfterCharIndex: number) => string,
  legalBreaksJson: (paragraphPayload: string) => readonly number[],
): readonly AfEditBreakpointVerdict[] {
  const verdicts: AfEditBreakpointVerdict[] = [];
  for (const entry of AF_BROWSER_CORPUS) {
    const fullFragments = linesToFragments(
      entry,
      layoutLines(entry, shapedLayoutJson),
      entry.fontSizePt,
    );
    const payload = paragraphPayload(entry);
    const legal = [...new Set(legalBreaksJson(payload))].sort((a, b) => a - b);
    const arbitrary = pickArbitraryBreakpoint(entry.paragraphText, legal);
    const breakpoints: Array<{ index: number; kind: AfEditBreakpointKind }> = [
      ...legal.map((index) => ({ index, kind: "legal" as const })),
      { index: arbitrary, kind: "arbitrary" },
    ];
    for (const { index, kind } of breakpoints) {
      const incRaw = layoutIncrementalAtBreak(payload, index);
      const incLines = JSON.parse(incRaw) as Array<{ text: string; width_pt: number; height_pt?: number }>;
      const incFragments = linesToFragments(entry, incLines, entry.fontSizePt);
      const incrementalEquivalent = fragmentsEquivalent(incFragments, fullFragments);
      verdicts.push({
        entryId: entry.id,
        breakAfterCharIndex: index,
        breakpointKind: kind,
        incrementalEquivalent,
        detail: incrementalEquivalent
          ? `${kind} breakpoint matches full layout fragments`
          : `${kind} breakpoint drift vs full layout`,
      });
    }
  }
  return verdicts;
}

export function buildAfEditBreakpointEvidence(
  shapedLayoutJson: ShapedLayoutJsonFn,
  layoutIncrementalAtBreak: (paragraphPayload: string, breakAfterCharIndex: number) => string,
  legalBreaksJson: (paragraphPayload: string) => readonly number[],
): AfEditBreakpointEvidence {
  const entries = evaluateAfEngineIncrementalAtEditBreakpoints(
    shapedLayoutJson,
    layoutIncrementalAtBreak,
    legalBreaksJson,
  );
  const legalEntries = entries.filter((e) => e.breakpointKind === "legal");
  const allLegalBreakpointsEquivalent =
    legalEntries.length > 0 && legalEntries.every((e) => e.incrementalEquivalent);
  return {
    recordedAt: new Date().toISOString(),
    corpusSize: AF_BROWSER_CORPUS.length,
    gateStatus: "not-run",
    allLegalBreakpointsEquivalent,
    arbitraryBreakpointsRecorded: entries.filter((e) => e.breakpointKind === "arbitrary").length,
    entries,
    note: "W2-G4-11 edit-breakpoint matrix on AF corpus; arbitrary mid-edit may drift; G4 gate not-run.",
  };
}
