import {
  AF_BROWSER_CORPUS,
  type AfBrowserCorpusEntry,
  type ShapedLayoutJsonFn,
} from "./fragmentation-af-browser-corpus.js";
import type { AfIncrementalEquivalenceVerdict } from "./fragmentation-af-incremental-equivalence.js";
import { fragmentsEquivalent } from "./fragmentation-equivalence-oracle.js";
import { measureFragmentFromBounds } from "./component-measurement-contract.js";
import type { MeasuredFragment } from "./component-measurement-contract.js";

function paragraphPayload(entry: AfBrowserCorpusEntry): string {
  return JSON.stringify({
    paragraph_id: entry.id,
    text: entry.paragraphText,
    max_width_pt: entry.maxWidthPt,
    font_size_pt: entry.fontSizePt,
  });
}

/** W2-G4-10: first legal line-boundary break after start (0 if single-line). */
export function pickAfLegalBreakCharIndex(
  entry: AfBrowserCorpusEntry,
  legalBreaksJson: (paragraphPayload: string) => readonly number[],
): number {
  const breaks = legalBreaksJson(paragraphPayload(entry));
  return breaks.find((b) => b > 0) ?? 0;
}

/** W2-G4-09/10: engine incremental vs full layout on AF corpus (legal break-token when available). */
export function evaluateAfEngineIncrementalVsFullEquivalence(
  shapedLayoutJson: ShapedLayoutJsonFn,
  layoutIncrementalAtBreak: (paragraphPayload: string, breakAfterCharIndex: number) => string,
  options?: {
    legalBreaksJson?: (paragraphPayload: string) => readonly number[];
  },
): readonly AfIncrementalEquivalenceVerdict[] {
  return AF_BROWSER_CORPUS.map((entry) => {
    const fullLines = layoutLines(entry, entry.paragraphText, shapedLayoutJson);
    const fullFragments = linesToFragments(entry, fullLines, entry.fontSizePt);

    const payload = paragraphPayload(entry);
    const breakAt = options?.legalBreaksJson
      ? pickAfLegalBreakCharIndex(entry, options.legalBreaksJson)
      : Math.ceil(entry.paragraphText.length / 2);
    const incRaw = layoutIncrementalAtBreak(payload, breakAt);
    const incLines = JSON.parse(incRaw) as Array<{ text: string; width_pt: number; height_pt?: number }>;
    const incFragments = linesToFragments(entry, incLines, entry.fontSizePt);

    const equivalent = fragmentsEquivalent(incFragments, fullFragments);
    const breakToken = Boolean(options?.legalBreaksJson);
    return {
      entryId: entry.id,
      equivalent,
      detail: equivalent
        ? breakToken
          ? "break-token incremental matches full layout fragments"
          : "engine incremental sketch matches full layout fragments"
        : breakToken
          ? "break-token incremental drift vs full layout"
          : "engine incremental sketch drift vs full layout (expected until true break-token incremental)",
    };
  });
}

function layoutLines(entry: AfBrowserCorpusEntry, text: string, shapedLayoutJson: ShapedLayoutJsonFn) {
  const payload = JSON.stringify({
    paragraph_id: entry.id,
    text,
    max_width_pt: entry.maxWidthPt,
    font_size_pt: entry.fontSizePt,
  });
  return JSON.parse(shapedLayoutJson(payload)) as Array<{
    text: string;
    width_pt: number;
    height_pt: number;
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
