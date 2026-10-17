import {
  AF_BROWSER_CORPUS,
  type AfBrowserCorpusEntry,
  type ShapedLayoutJsonFn,
} from "./fragmentation-af-browser-corpus.js";
import { fragmentsEquivalent } from "./fragmentation-equivalence-oracle.js";
import { measureFragmentFromBounds } from "./component-measurement-contract.js";
import type { MeasuredFragment } from "./component-measurement-contract.js";

/** W2-G4-06: incremental (split paragraph) vs full shaped layout on AF corpus. */
export interface AfIncrementalEquivalenceVerdict {
  entryId: string;
  equivalent: boolean;
  detail: string;
}

export interface IncrementalLayoutHooks {
  legalBreaksJson?: ShapedLayoutJsonFn;
  incrementalLayoutJson?: (inputJson: string) => string;
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

function linesToFragments(entry: AfBrowserCorpusEntry, lines: Array<{ text: string; width_pt: number; height_pt: number }>): MeasuredFragment[] {
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
          yPt: index * (line.height_pt || 14),
          widthPt: line.width_pt,
          heightPt: line.height_pt || 14,
        },
      ],
    );
    if (!measured.ok) throw new Error(String(measured.error));
    return measured.measured;
  });
}

function lineTextSignature(lines: Array<{ text: string }>): string {
  return lines.map((l) => l.text).join("\u241E");
}

/** Compare full layout to WASM incremental continuation at a legal line break. */
export function evaluateAfIncrementalVsFullEquivalence(
  shapedLayoutJson: ShapedLayoutJsonFn,
  hooks?: IncrementalLayoutHooks,
): readonly AfIncrementalEquivalenceVerdict[] {
  return AF_BROWSER_CORPUS.map((entry) => {
    const fullLines = layoutLines(entry, entry.paragraphText, shapedLayoutJson);
    const paragraphPayload = JSON.stringify({
      paragraph_id: entry.id,
      text: entry.paragraphText,
      max_width_pt: entry.maxWidthPt,
      font_size_pt: entry.fontSizePt,
    });

    if (hooks?.legalBreaksJson && hooks.incrementalLayoutJson) {
      const legal = JSON.parse(hooks.legalBreaksJson(paragraphPayload)) as number[];
      const breakAt =
        legal.find((i) => i > 0 && i < entry.paragraphText.length) ?? 0;
      const incRaw = hooks.incrementalLayoutJson(
        JSON.stringify({
          paragraph: JSON.parse(paragraphPayload),
          breakAfterCharIndex: breakAt,
        }),
      );
      const incLines = JSON.parse(incRaw) as Array<{ text: string }>;
      const equivalent = lineTextSignature(fullLines) === lineTextSignature(incLines);
      return {
        entryId: entry.id,
        equivalent,
        detail: equivalent
          ? `incremental legal-break ${breakAt} matches full line texts`
          : `incremental legal-break ${breakAt} drifted vs full layout`,
      };
    }

    const fullFragments = linesToFragments(entry, fullLines);
    const mid = Math.ceil(entry.paragraphText.length / 2);
    const first = entry.paragraphText.slice(0, mid);
    const second = entry.paragraphText.slice(mid);
    const incLines = [
      ...layoutLines(entry, first, shapedLayoutJson),
      ...layoutLines(entry, second, shapedLayoutJson),
    ];
    const incFragments = linesToFragments(entry, incLines);
    const equivalent = fragmentsEquivalent(incFragments, fullFragments);
    return {
      entryId: entry.id,
      equivalent,
      detail: equivalent
        ? "incremental split layout matches full layout fragments"
        : "mid-string split layout drift vs full (use legal-break WASM hooks)",
    };
  });
}

export function afIncrementalAllEquivalent(
  verdicts: readonly AfIncrementalEquivalenceVerdict[],
): boolean {
  return verdicts.every((v) => v.equivalent);
}
