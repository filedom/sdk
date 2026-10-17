import {
  AF_BROWSER_CORPUS,
  type AfBrowserCorpusEntry,
  type ShapedLayoutJsonFn,
} from "./fragmentation-af-browser-corpus.js";
import {
  evaluateAfIncrementalVsFullEquivalence,
  type AfIncrementalEquivalenceVerdict,
} from "./fragmentation-af-incremental-equivalence.js";

/** W2-G4-07: gate-grade incremental≡full evidence (oracle expanded beyond stub). */
export interface AfIncrementalGateGradeEntry {
  entryId: string;
  fullLayoutIdempotent: boolean;
  incrementalEquivalent: boolean;
  fullLineSignature: string;
  incrementalLineSignature: string;
  gateGradeStatus: "not-run" | "incremental-drift-recorded" | "incremental-matches-full";
  detail: string;
}

export interface AfIncrementalGateGradeEvidence {
  recordedAt: string;
  corpusSize: number;
  gateStatus: "not-run";
  entries: readonly AfIncrementalGateGradeEntry[];
  note: string;
}

function lineSignature(entry: AfBrowserCorpusEntry, text: string, shapedLayoutJson: ShapedLayoutJsonFn): string {
  const payload = JSON.stringify({
    paragraph_id: entry.id,
    text,
    max_width_pt: entry.maxWidthPt,
    font_size_pt: entry.fontSizePt,
  });
  const lines = JSON.parse(shapedLayoutJson(payload)) as Array<{ text: string }>;
  return lines.map((l) => l.text).join("\u241E");
}

/** Full layout twice must match; incremental split compared to full (testable oracle). */
export function evaluateAfIncrementalGateGrade(
  shapedLayoutJson: ShapedLayoutJsonFn,
): readonly AfIncrementalGateGradeEntry[] {
  const incrementalVerdicts = evaluateAfIncrementalVsFullEquivalence(shapedLayoutJson);
  const byId = new Map(incrementalVerdicts.map((v) => [v.entryId, v]));

  return AF_BROWSER_CORPUS.map((entry) => {
    const fullA = lineSignature(entry, entry.paragraphText, shapedLayoutJson);
    const fullB = lineSignature(entry, entry.paragraphText, shapedLayoutJson);
    const fullLayoutIdempotent = fullA === fullB;

    const mid = Math.ceil(entry.paragraphText.length / 2);
    const incSig = [
      lineSignature(entry, entry.paragraphText.slice(0, mid), shapedLayoutJson),
      lineSignature(entry, entry.paragraphText.slice(mid), shapedLayoutJson),
    ].join("\u241F");

    const incVerdict: AfIncrementalEquivalenceVerdict | undefined = byId.get(entry.id);
    const incrementalEquivalent = incVerdict?.equivalent === true;

    let gateGradeStatus: AfIncrementalGateGradeEntry["gateGradeStatus"] = "not-run";
    if (incrementalEquivalent) {
      gateGradeStatus = "incremental-matches-full";
    } else if (fullLayoutIdempotent) {
      gateGradeStatus = "incremental-drift-recorded";
    }

    return {
      entryId: entry.id,
      fullLayoutIdempotent,
      incrementalEquivalent,
      fullLineSignature: fullA,
      incrementalLineSignature: incSig,
      gateGradeStatus,
      detail: incVerdict?.detail ?? "missing incremental verdict",
    };
  });
}

export function buildAfIncrementalGateGradeEvidence(
  shapedLayoutJson: ShapedLayoutJsonFn,
): AfIncrementalGateGradeEvidence {
  const entries = evaluateAfIncrementalGateGrade(shapedLayoutJson);
  const anyMatch = entries.some((e) => e.gateGradeStatus === "incremental-matches-full");
  return {
    recordedAt: new Date().toISOString(),
    corpusSize: entries.length,
    gateStatus: "not-run",
    entries,
    note: anyMatch
      ? "Some corpus entries match incremental≡full; G4 gate proof still not-run until engine incremental path is authoritative."
      : "Incremental drift recorded on AF corpus; G4 gate proof not-run.",
  };
}
