import type { OpcPackage } from "./opc-package.js";
import { getMemberUtf8, setMemberUtf8 } from "./opc-package.js";
import {
  applyReviewSuggestionDecisionStub,
  parseReviewSuggestionMarksFromDocumentXml,
  type ReviewSuggestionDecision,
  type ReviewSuggestionDecisionResult,
  type ReviewSuggestionMarkStub,
} from "./review-suggestion-accept-reject-stub.js";

export const DOCX_DOCUMENT_PART = "word/document.xml" as const;

/** G2/M2: deterministic document.xml annotation after accept/reject (full OOXML unwrap TBD). */
export function patchDocumentXmlForReviewSuggestionDecision(
  xml: string,
  suggestionId: string,
  decision: ReviewSuggestionDecision,
): string {
  const escapedId = suggestionId.replace(/"/g, "&quot;");
  const marker = `<!-- domdoc:review-decision id="${escapedId}" decision="${decision}" -->`;
  if (xml.includes("</w:body>")) {
    return xml.replace("</w:body>", `  ${marker}\n</w:body>`);
  }
  return `${xml.trim()}\n${marker}\n`;
}

export interface ReviewSuggestionOpcPatchResult {
  pkg: OpcPackage;
  documentXml: string;
  decision: ReviewSuggestionDecisionResult;
}

/** Apply in-memory suggestion decision and stamp OPC document.xml (F34 + G2-DOCX-06 pattern). */
export function applyReviewSuggestionDecisionToOpcPackage(
  pkg: OpcPackage,
  marks: readonly ReviewSuggestionMarkStub[],
  suggestionId: string,
  decision: ReviewSuggestionDecision,
  documentXmlOverride?: string,
): ReviewSuggestionOpcPatchResult {
  const decisionResult = applyReviewSuggestionDecisionStub(marks, suggestionId, decision);
  let documentXml = documentXmlOverride;
  if (documentXml === undefined) {
    documentXml = getMemberUtf8(pkg, DOCX_DOCUMENT_PART);
  }
  const patchedMembers = new Map(pkg.members);
  const patchedPkg: OpcPackage = { members: patchedMembers };
  if (decisionResult.applied) {
    setMemberUtf8(
      patchedPkg,
      DOCX_DOCUMENT_PART,
      patchDocumentXmlForReviewSuggestionDecision(documentXml, suggestionId, decision),
    );
  }
  return {
    pkg: patchedPkg,
    documentXml: getMemberUtf8(patchedPkg, DOCX_DOCUMENT_PART),
    decision: decisionResult,
  };
}

/** Parse tracked document.xml and run accept/reject with OPC write-back stub. */
export function applyReviewSuggestionDecisionFromDocumentXml(
  pkg: OpcPackage,
  suggestionId: string,
  decision: ReviewSuggestionDecision,
): ReviewSuggestionOpcPatchResult {
  const documentXml = getMemberUtf8(pkg, DOCX_DOCUMENT_PART);
  const marks = parseReviewSuggestionMarksFromDocumentXml(documentXml);
  return applyReviewSuggestionDecisionToOpcPackage(
    pkg,
    marks,
    suggestionId,
    decision,
    documentXml,
  );
}
