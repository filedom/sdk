import {
  AF_BROWSER_CORPUS,
  type ShapedLayoutJsonFn,
} from "./fragmentation-af-browser-corpus.js";
import {
  buildAfPostEditGateGradeScaleEvidence,
  type AfPostEditGateGradeScaleEvidence,
} from "./fragmentation-af-post-edit-gate-grade-scale.js";
import type { AfIncrementalEnginePath } from "./fragmentation-af-incremental-authoritative.js";

/** W2-G4-17: browser/WASM authoritative post-edit scale evidence (gate still not-run). */
export interface AfBrowserPostEditGateGradeEvidence extends AfPostEditGateGradeScaleEvidence {
  card: "W2-G4-17";
  proofPath: "browser-demo-wasm" | "node-wasm-pkg";
  incrementalEnginePath: AfIncrementalEnginePath;
  authoritativeGatePath: "not-run";
}

export function buildAfBrowserPostEditGateGradeEvidence(
  shapedLayoutJson: ShapedLayoutJsonFn,
  layoutIncrementalWithPreEdit: (
    paragraphPayload: string,
    breakAfterCharIndex: number,
    preEditText: string,
  ) => string,
  options: {
    incrementalEnginePath: AfIncrementalEnginePath;
    proofPath: AfBrowserPostEditGateGradeEvidence["proofPath"];
    breakpointsPerEntry?: number;
  },
): AfBrowserPostEditGateGradeEvidence {
  const scale = buildAfPostEditGateGradeScaleEvidence(
    shapedLayoutJson,
    layoutIncrementalWithPreEdit,
    { breakpointsPerEntry: options.breakpointsPerEntry ?? 3 },
  );
  return {
    ...scale,
    card: "W2-G4-17",
    corpusSize: AF_BROWSER_CORPUS.length,
    proofPath: options.proofPath,
    incrementalEnginePath: options.incrementalEnginePath,
    authoritativeGatePath: "not-run",
    note: "W2-G4-17 browser AF post-edit scale on WASM incremental path; G4 authoritative gate proof still not-run",
  };
}
