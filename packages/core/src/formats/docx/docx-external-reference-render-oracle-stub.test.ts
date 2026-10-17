import { describe, expect, it } from "vitest";
import {
  buildDocxExternalReferenceRenderOracleStub,
  DOCX_EXTERNAL_REFERENCE_RENDER_ORACLE_FEATURE_ID,
} from "./docx-external-reference-render-oracle-stub.js";

describe("G2 external reference render oracle stub", () => {
  it("returns honest not-run JSON diff placeholder", () => {
    const oracle = buildDocxExternalReferenceRenderOracleStub("word-layout-oracle-stub");
    expect(oracle.featureId).toBe(DOCX_EXTERNAL_REFERENCE_RENDER_ORACLE_FEATURE_ID);
    expect(oracle.gateStatus).toBe("not-run");
    expect(oracle.jsonDiff.status).toBe("not-run");
    expect(oracle.jsonDiff.diffSummary).toBeNull();
    expect(oracle.jsonDiff.actualSnapshotPath).toBeNull();
  });
});
