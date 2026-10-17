import {
  AF_BROWSER_CORPUS,
  type ShapedLayoutJsonFn,
} from "./fragmentation-af-browser-corpus.js";
import {
  evaluateAfIncrementalVsFullEquivalence,
  afIncrementalAllEquivalent,
} from "./fragmentation-af-incremental-equivalence.js";

/** W2-G4-08: authoritative full layout vs incremental oracle (engine path not exposed yet). */
export type AfIncrementalEnginePath = "unavailable" | "oracle-split";

export interface AfAuthoritativeIncrementalEntry {
  entryId: string;
  fullLayoutAuthoritative: true;
  incrementalPath: AfIncrementalEnginePath;
  incrementalEquivalent: boolean;
  equivalenceTestable: boolean;
  detail: string;
}

export interface AfAuthoritativeIncrementalEvidence {
  recordedAt: string;
  corpusSize: number;
  incrementalEnginePath: AfIncrementalEnginePath;
  allIncrementalEquivalent: boolean;
  gateStatus: "not-run";
  entries: readonly AfAuthoritativeIncrementalEntry[];
  note: string;
}

export function detectAfIncrementalEnginePath(
  _shapedLayoutJson: ShapedLayoutJsonFn,
): AfIncrementalEnginePath {
  return "unavailable";
}

export function evaluateAfAuthoritativeIncrementalLayout(
  shapedLayoutJson: ShapedLayoutJsonFn,
): readonly AfAuthoritativeIncrementalEntry[] {
  const enginePath = detectAfIncrementalEnginePath(shapedLayoutJson);
  const verdicts = evaluateAfIncrementalVsFullEquivalence(shapedLayoutJson);
  return verdicts.map((v) => {
    const incrementalPath: AfIncrementalEnginePath =
      enginePath === "unavailable" ? "oracle-split" : enginePath;
    const equivalenceTestable = incrementalPath === "oracle-split";
    return {
      entryId: v.entryId,
      fullLayoutAuthoritative: true as const,
      incrementalPath,
      incrementalEquivalent: v.equivalent,
      equivalenceTestable,
      detail:
        enginePath === "unavailable"
          ? `${v.detail} (oracle-split; WASM incremental API unavailable)`
          : v.detail,
    };
  });
}

export function buildAfAuthoritativeIncrementalEvidence(
  shapedLayoutJson: ShapedLayoutJsonFn,
): AfAuthoritativeIncrementalEvidence {
  const entries = evaluateAfAuthoritativeIncrementalLayout(shapedLayoutJson);
  const incrementalEnginePath = detectAfIncrementalEnginePath(shapedLayoutJson);
  const allIncrementalEquivalent = afIncrementalAllEquivalent(
    entries.map((e) => ({
      entryId: e.entryId,
      equivalent: e.incrementalEquivalent,
      detail: e.detail,
    })),
  );
  return {
    recordedAt: new Date().toISOString(),
    corpusSize: AF_BROWSER_CORPUS.length,
    incrementalEnginePath,
    allIncrementalEquivalent,
    gateStatus: "not-run",
    entries,
    note:
      incrementalEnginePath === "unavailable"
        ? "Authoritative layout is full shaped pass; incremental≡full tested via oracle-split only. G4 gate not-run."
        : "Engine incremental path present; gate proof still not-run until CI evidence.",
  };
}
