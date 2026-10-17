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

/** W2-G4-18/19: bind browser + node WASM proof paths; gate proof remains not-run until coordinator. */
export type AfAuthoritativeGateProofPath = "not-run" | "node-wasm-recorded" | "browser-demo-recorded";

/** W2-G4-19: coordinator may promote path only when bundled evidence criteria are met. */
export interface AfAuthoritativeGateCoordinatorAccept {
  coordinatorAccept: true;
  coordinatorId: string;
  browserDemoPostEditEquivalent: boolean;
  nodeWasmPostEditEquivalent: boolean;
  e2eAfCorpusDeclared: boolean;
}

export interface AfAuthoritativeGateProofRunnerEvidence {
  recordedAt: string;
  card: "W2-G4-18" | "W2-G4-19";
  gateStatus: "not-run";
  authoritativeGatePath: AfAuthoritativeGateProofPath;
  nodeWasmPostEdit: AfBrowserPostEditGateGradeEvidence | null;
  browserPostEditProofPath: "browser-demo-wasm";
  incrementalAuthoritative: AfAuthoritativeIncrementalEvidence;
  nodeWasmExercised: boolean;
  browserPathDeclared: boolean;
  note: string;
}

export function resolveAuthoritativeGatePathFromCoordinatorAccept(
  coordinator: AfAuthoritativeGateCoordinatorAccept | undefined,
  nodeWasmExercised: boolean,
): AfAuthoritativeGateProofPath {
  if (!coordinator?.coordinatorAccept || !coordinator.coordinatorId.trim()) {
    return "not-run";
  }
  const bundled =
    coordinator.browserDemoPostEditEquivalent &&
    coordinator.nodeWasmPostEditEquivalent &&
    coordinator.e2eAfCorpusDeclared;
  if (!bundled) {
    return "not-run";
  }
  if (nodeWasmExercised) {
    return "node-wasm-recorded";
  }
  return "browser-demo-recorded";
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
    /** W2-G4-19: optional coordinator promotion hook (defaults to not-run). */
    coordinatorAccept?: AfAuthoritativeGateCoordinatorAccept;
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
  const authoritativeGatePath = resolveAuthoritativeGatePathFromCoordinatorAccept(
    options.coordinatorAccept,
    nodeWasmExercised,
  );
  const card = options.coordinatorAccept ? "W2-G4-19" : "W2-G4-18";
  const note =
    authoritativeGatePath === "not-run"
      ? options.coordinatorAccept
        ? "W2-G4-19 coordinator hook evaluated; authoritativeGatePath not-run until bundled browser+e2e+node evidence passes."
        : "W2-G4-18 authoritative G4 gate proof runner binds browser demo + node WASM paths; gate G4 not-run."
      : `W2-G4-19 coordinator promoted authoritativeGatePath=${authoritativeGatePath}; gate G4 still not-run until full coordinator gate review.`;

  return {
    recordedAt: new Date().toISOString(),
    card,
    gateStatus: "not-run",
    authoritativeGatePath,
    nodeWasmPostEdit,
    browserPostEditProofPath: "browser-demo-wasm",
    incrementalAuthoritative,
    nodeWasmExercised,
    browserPathDeclared: true,
    note,
  };
}
