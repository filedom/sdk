import {
  buildAfBrowserPostEditGateGradeEvidence,
  type AfBrowserPostEditGateGradeEvidence,
} from "./fragmentation-af-browser-post-edit-gate-grade.js";
import {
  buildAfAuthoritativeIncrementalEvidence,
  type AfAuthoritativeIncrementalEvidence,
  type AfAuthoritativeIncrementalOptions,
} from "./fragmentation-af-incremental-authoritative.js";
import type { ShapedLayoutJsonFn } from "./fragmentation-af-browser-corpus.js";

/** W2-G4-18: bind browser + node WASM proof paths; gate proof remains not-run until coordinator. */
export type AfAuthoritativeGateProofPath = "not-run" | "node-wasm-recorded" | "browser-demo-recorded";

export interface AfAuthoritativeGateProofRunnerEvidence {
  recordedAt: string;
  card: "W2-G4-18";
  gateStatus: "not-run";
  authoritativeGatePath: AfAuthoritativeGateProofPath;
  nodeWasmPostEdit: AfBrowserPostEditGateGradeEvidence | null;
  browserPostEditProofPath: "browser-demo-wasm";
  incrementalAuthoritative: AfAuthoritativeIncrementalEvidence;
  nodeWasmExercised: boolean;
  browserPathDeclared: boolean;
  note: string;
}

export function buildAfAuthoritativeGateProofRunnerEvidence(
  shapedLayoutJson: ShapedLayoutJsonFn,
  options: {
    layoutIncrementalWithPreEdit?: (
      paragraphPayload: string,
      breakAfterCharIndex: number,
      preEditText: string,
    ) => string;
    incrementalOptions?: AfAuthoritativeIncrementalOptions;
    nodeWasmPostEdit?: AfBrowserPostEditGateGradeEvidence | null;
  },
): AfAuthoritativeGateProofRunnerEvidence {
  const incrementalAuthoritative = buildAfAuthoritativeIncrementalEvidence(
    shapedLayoutJson,
    options.incrementalOptions,
  );
  const nodeWasmPostEdit =
    options.nodeWasmPostEdit ??
    (options.layoutIncrementalWithPreEdit
      ? buildAfBrowserPostEditGateGradeEvidence(
          shapedLayoutJson,
          options.layoutIncrementalWithPreEdit,
          {
            incrementalEnginePath: options.incrementalOptions?.incrementalEnginePath ?? "unavailable",
            proofPath: "node-wasm-pkg",
          },
        )
      : null);

  const nodeWasmExercised = nodeWasmPostEdit?.proofPath === "node-wasm-pkg";
  const authoritativeGatePath: AfAuthoritativeGateProofPath = "not-run";

  return {
    recordedAt: new Date().toISOString(),
    card: "W2-G4-18",
    gateStatus: "not-run",
    authoritativeGatePath,
    nodeWasmPostEdit,
    browserPostEditProofPath: "browser-demo-wasm",
    incrementalAuthoritative,
    nodeWasmExercised,
    browserPathDeclared: true,
    note: "W2-G4-18 authoritative G4 gate proof runner binds browser demo + node WASM paths; gate G4 not-run.",
  };
}
