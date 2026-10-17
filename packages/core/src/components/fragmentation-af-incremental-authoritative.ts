import {
  AF_BROWSER_CORPUS,
  type ShapedLayoutJsonFn,
} from "./fragmentation-af-browser-corpus.js";
import {
  evaluateAfIncrementalVsFullEquivalence,
  afIncrementalAllEquivalent,
} from "./fragmentation-af-incremental-equivalence.js";
import { evaluateAfEngineIncrementalVsFullEquivalence } from "./fragmentation-af-incremental-engine.js";

/** W2-G4-08/09: authoritative full layout vs incremental oracle or engine sketch. */
export type AfIncrementalEnginePath =
  | "unavailable"
  | "oracle-split"
  | "engine-sketch"
  | "break-token";

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

export interface AfAuthoritativeIncrementalOptions {
  incrementalEnginePath?: AfIncrementalEnginePath;
  layoutIncrementalAtBreak?: (paragraphPayload: string, breakAfterCharIndex: number) => string;
  legalBreaksJson?: (paragraphPayload: string) => readonly number[];
}

export function detectAfIncrementalEnginePath(
  options?: AfAuthoritativeIncrementalOptions,
): AfIncrementalEnginePath {
  return options?.incrementalEnginePath ?? "unavailable";
}

export function evaluateAfAuthoritativeIncrementalLayout(
  shapedLayoutJson: ShapedLayoutJsonFn,
  options?: AfAuthoritativeIncrementalOptions,
): readonly AfAuthoritativeIncrementalEntry[] {
  const enginePath = detectAfIncrementalEnginePath(options);
  const useEngine =
    (enginePath === "engine-sketch" || enginePath === "break-token") &&
    typeof options?.layoutIncrementalAtBreak === "function";
  const verdicts = useEngine
    ? evaluateAfEngineIncrementalVsFullEquivalence(
        shapedLayoutJson,
        options!.layoutIncrementalAtBreak!,
        { legalBreaksJson: options?.legalBreaksJson },
      )
    : evaluateAfIncrementalVsFullEquivalence(shapedLayoutJson);
  return verdicts.map((v) => {
    const incrementalPath: AfIncrementalEnginePath =
      enginePath === "unavailable" ? "oracle-split" : enginePath;
    const equivalenceTestable = true;
    return {
      entryId: v.entryId,
      fullLayoutAuthoritative: true as const,
      incrementalPath,
      incrementalEquivalent: v.equivalent,
      equivalenceTestable,
      detail:
        enginePath === "unavailable"
          ? `${v.detail} (oracle-split; WASM incremental API unavailable)`
          : enginePath === "engine-sketch"
            ? `${v.detail} (engine-sketch via layout_flow_paragraph_incremental_json)`
            : enginePath === "break-token"
              ? `${v.detail} (break-token via layout_flow_paragraph_legal_breaks_json)`
              : v.detail,
    };
  });
}

export function buildAfAuthoritativeIncrementalEvidence(
  shapedLayoutJson: ShapedLayoutJsonFn,
  options?: AfAuthoritativeIncrementalOptions,
): AfAuthoritativeIncrementalEvidence {
  const entries = evaluateAfAuthoritativeIncrementalLayout(shapedLayoutJson, options);
  const incrementalEnginePath = detectAfIncrementalEnginePath(options);
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
        : incrementalEnginePath === "engine-sketch"
          ? "W2-G4-09 engine incremental sketch exported; equivalence recorded; G4 gate not-run."
          : incrementalEnginePath === "break-token"
            ? "W2-G4-10 break-token incremental at legal line boundaries; AF equivalence recorded; G4 gate not-run."
            : "Engine incremental path present; gate proof still not-run until CI evidence.",
  };
}
