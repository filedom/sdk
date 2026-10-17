import { measureFragmentFromBounds } from "./component-measurement-contract.js";
import {
  runFragmentationConvergenceOracle,
  type FragmentationEquivalenceVerdict,
  type FragmentationLayoutPass,
} from "./fragmentation-equivalence-oracle.js";

/** W2-G4-05: AF acceptance subset — browser-measurable with live WASM layout lines. */
export interface AfBrowserCorpusEntry {
  readonly id: string;
  readonly paragraphText: string;
  readonly maxWidthPt: number;
  readonly fontSizePt: number;
}

export const AF_BROWSER_CORPUS: readonly AfBrowserCorpusEntry[] = [
  {
    id: "AF-01",
    paragraphText: "fragmentation stability short",
    maxWidthPt: 160,
    fontSizePt: 12,
  },
  {
    id: "AF-02",
    paragraphText: "repeated layout pass must converge on identical line breaks",
    maxWidthPt: 120,
    fontSizePt: 11,
  },
  {
    id: "AF-03",
    paragraphText: "component boundary probe with longer wrapped paragraph text",
    maxWidthPt: 96,
    fontSizePt: 10,
  },
];

export type ShapedLayoutJsonFn = (payloadJson: string) => string;

function layoutPassFromShapedJson(
  entry: AfBrowserCorpusEntry,
  _passIndex: number,
  shapedLayoutJson: ShapedLayoutJsonFn,
): FragmentationLayoutPass {
  const payload = JSON.stringify({
    paragraph_id: entry.id,
    text: entry.paragraphText,
    max_width_pt: entry.maxWidthPt,
    font_size_pt: entry.fontSizePt,
  });
  const lines = JSON.parse(shapedLayoutJson(payload)) as Array<{
    text: string;
    width_pt: number;
    height_pt: number;
  }>;
  const fragments = lines.map((line, index) => {
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
  return { passIndex: _passIndex, fragments, breakTokens: [] };
}

export interface AfBrowserCorpusVerdict {
  entryId: string;
  oracle: FragmentationEquivalenceVerdict;
}

/** Run bounded convergence oracle for each AF entry using repeated shaped layout calls. */
export function evaluateAfBrowserCorpus(
  shapedLayoutJson: ShapedLayoutJsonFn,
  maxPasses = 3,
): readonly AfBrowserCorpusVerdict[] {
  return AF_BROWSER_CORPUS.map((entry) => ({
    entryId: entry.id,
    oracle: runFragmentationConvergenceOracle(
      (pass) => layoutPassFromShapedJson(entry, pass, shapedLayoutJson),
      maxPasses,
    ),
  }));
}

export function afCorpusAllConverged(verdicts: readonly AfBrowserCorpusVerdict[]): boolean {
  return verdicts.every((v) => v.oracle.equivalent);
}
