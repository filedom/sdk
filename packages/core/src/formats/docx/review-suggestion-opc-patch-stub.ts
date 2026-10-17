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

function unwrapRevisionMarkup(
  xml: string,
  suggestionId: string,
  decision: ReviewSuggestionDecision,
): string {
  const marks = parseReviewSuggestionMarksFromDocumentXml(xml);
  const target = marks.find((m) => m.suggestionId === suggestionId);
  if (!target) return xml;
  const keepInner =
    (decision === "accept" && target.kind === "insert") ||
    (decision === "reject" && target.kind === "delete");
  const tag = target.kind === "insert" ? "ins" : "del";
  const re = new RegExp(`<w:${tag}\\b([^>]*)>([\\s\\S]*?)<\\/w:${tag}>`, "g");
  return xml.replace(re, (full, attrs: string, inner: string) => {
    const id = /(?:w:)?id="([^"]+)"/.exec(attrs)?.[1];
    if (id !== suggestionId) return full;
    return keepInner ? inner : "";
  });
}

/** G2/D03: unwrap w:ins/w:del for the decided id, then stamp a review marker. */
export function patchDocumentXmlForReviewSuggestionDecision(
  xml: string,
  suggestionId: string,
  decision: ReviewSuggestionDecision,
): string {
  const unwrapped = unwrapRevisionMarkup(xml, suggestionId, decision);
  const escapedId = suggestionId.replace(/"/g, "&quot;");
  const marker = `<!-- domdoc:review-decision id="${escapedId}" decision="${decision}" -->`;
  if (unwrapped.includes("</w:body>")) {
    return unwrapped.replace("</w:body>", `  ${marker}\n</w:body>`);
  }
  return `${unwrapped.trim()}\n${marker}\n`;
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
