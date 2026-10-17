import {
  AF_BROWSER_CORPUS,
  type AfBrowserCorpusEntry,
  type ShapedLayoutJsonFn,
} from "./fragmentation-af-browser-corpus.js";
import {
  evaluateAfIncrementalVsFullEquivalence,
  type AfIncrementalEquivalenceVerdict,
  type IncrementalLayoutHooks,
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

/** Full layout twice must match; incremental compared to full (testable oracle). */
export function evaluateAfIncrementalGateGrade(
  shapedLayoutJson: ShapedLayoutJsonFn,
  hooks?: IncrementalLayoutHooks,
): readonly AfIncrementalGateGradeEntry[] {
  const incrementalVerdicts = evaluateAfIncrementalVsFullEquivalence(shapedLayoutJson, hooks);
  const byId = new Map(incrementalVerdicts.map((v) => [v.entryId, v]));

  return AF_BROWSER_CORPUS.map((entry) => {
    const fullA = lineSignature(entry, entry.paragraphText, shapedLayoutJson);
    const fullB = lineSignature(entry, entry.paragraphText, shapedLayoutJson);
    const fullLayoutIdempotent = fullA === fullB;
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
      incrementalLineSignature: incVerdict?.detail ?? "",
      gateGradeStatus,
      detail: incVerdict?.detail ?? "missing incremental verdict",
    };
  });
}

export function buildAfIncrementalGateGradeEvidence(
  shapedLayoutJson: ShapedLayoutJsonFn,
  hooks?: IncrementalLayoutHooks,
): AfIncrementalGateGradeEvidence {
  const entries = evaluateAfIncrementalGateGrade(shapedLayoutJson, hooks);
  const anyMatch = entries.some((e) => e.gateGradeStatus === "incremental-matches-full");
  return {
    recordedAt: new Date().toISOString(),
    corpusSize: entries.length,
    gateStatus: "not-run",
    entries,
    note: anyMatch
      ? "Legal-break incremental line texts match full layout on some AF entries; G4 still not-run (C01–C04 component pagination not proved)."
      : "Incremental drift recorded on AF corpus; G4 gate proof not-run.",
  };
}
