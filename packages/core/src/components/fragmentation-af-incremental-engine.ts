import {
  AF_BROWSER_CORPUS,
  type AfBrowserCorpusEntry,
  type ShapedLayoutJsonFn,
} from "./fragmentation-af-browser-corpus.js";
import type { AfIncrementalEquivalenceVerdict } from "./fragmentation-af-incremental-equivalence.js";
import { fragmentsEquivalent } from "./fragmentation-equivalence-oracle.js";
import { measureFragmentFromBounds } from "./component-measurement-contract.js";
import type { MeasuredFragment } from "./component-measurement-contract.js";

/** W2-G4-09: engine incremental sketch vs full layout on AF corpus. */
export function evaluateAfEngineIncrementalVsFullEquivalence(
  shapedLayoutJson: ShapedLayoutJsonFn,
  layoutIncrementalAtBreak: (paragraphPayload: string, breakAfterCharIndex: number) => string,
): readonly AfIncrementalEquivalenceVerdict[] {
  return AF_BROWSER_CORPUS.map((entry) => {
    const fullLines = layoutLines(entry, entry.paragraphText, shapedLayoutJson);
    const fullFragments = linesToFragments(entry, fullLines);

    const mid = Math.ceil(entry.paragraphText.length / 2);
    const paragraphPayload = JSON.stringify({
      paragraph_id: entry.id,
      text: entry.paragraphText,
      max_width_pt: entry.maxWidthPt,
      font_size_pt: entry.fontSizePt,
    });
    const incRaw = layoutIncrementalAtBreak(paragraphPayload, mid);
    const incLines = JSON.parse(incRaw) as Array<{ text: string; width_pt: number; height_pt: number }>;
    const incFragments = linesToFragments(entry, incLines);

    const equivalent = fragmentsEquivalent(incFragments, fullFragments);
    return {
      entryId: entry.id,
      equivalent,
      detail: equivalent
        ? "engine incremental sketch matches full layout fragments"
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

function linesToFragments(
  entry: AfBrowserCorpusEntry,
  lines: Array<{ text: string; width_pt: number; height_pt: number }>,
): MeasuredFragment[] {
  return lines.map((line, index) => {
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
          yPt: index * line.height_pt,
          widthPt: line.width_pt,
          heightPt: line.height_pt,
        },
      ],
    );
    if (!measured.ok) throw new Error(String(measured.error));
    return measured.measured;
  });
}
