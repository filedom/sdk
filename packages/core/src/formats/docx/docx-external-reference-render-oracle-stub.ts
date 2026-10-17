/** G2 AD — external layout / interoperability render oracle placeholder (JSON diff not-run). */

export const DOCX_EXTERNAL_REFERENCE_RENDER_ORACLE_FEATURE_ID = "G2-DOCX-EXTERNAL-REF-RENDER" as const;

export interface DocxExternalReferenceRenderOracleJsonDiffPlaceholder {
  status: "not-run";
  diffEngine: "json-diff-placeholder";
  referenceOracleId: string | null;
  expectedSnapshotPath: string;
  actualSnapshotPath: string | null;
  diffSummary: null;
}

export interface DocxExternalReferenceRenderOracleStubResult {
  featureId: typeof DOCX_EXTERNAL_REFERENCE_RENDER_ORACLE_FEATURE_ID;
  gateStatus: "not-run";
  oracleKind: "external-reference-render";
  jsonDiff: DocxExternalReferenceRenderOracleJsonDiffPlaceholder;
  limitations: string;
}

export function buildDocxExternalReferenceRenderOracleStub(
  referenceOracleId: string | null = null,
): DocxExternalReferenceRenderOracleStubResult {
  return {
    featureId: DOCX_EXTERNAL_REFERENCE_RENDER_ORACLE_FEATURE_ID,
    gateStatus: "not-run",
    oracleKind: "external-reference-render",
    jsonDiff: {
      status: "not-run",
      diffEngine: "json-diff-placeholder",
      referenceOracleId,
      expectedSnapshotPath:
        "evidence/gates/G2-feasibility/docx-external-reference-render-oracle-expected.json",
      actualSnapshotPath: null,
      diffSummary: null,
    },
    limitations:
      "Independent Word/LibreOffice or external reference render oracle not executed; JSON diff slot reserved.",
  };
}
