/**
 * M2 review accept/reject stub — suggestion-mark pattern (insert/delete spans).
 * Behavior reference: prosemirror-suggestion-mode accept/reject; no native OOXML mutation yet.
 */

export const REVIEW_SUGGESTION_FEATURE_REGISTRY_ID = "F34" as const;

export type ReviewSuggestionKind = "insert" | "delete";

export interface ReviewSuggestionMarkStub {
  suggestionId: string;
  kind: ReviewSuggestionKind;
  text: string;
}

export type ReviewSuggestionDecision = "accept" | "reject";

export interface ReviewSuggestionDecisionResult {
  featureId: typeof REVIEW_SUGGESTION_FEATURE_REGISTRY_ID;
  suggestionId: string;
  decision: ReviewSuggestionDecision;
  applied: boolean;
  remainingMarks: ReviewSuggestionMarkStub[];
  /** Plain text after decision (suggestion-mode semantics). */
  resultingPlainText: string;
}

const INS_TAG = /<w:ins\b([^>]*)>([\s\S]*?)<\/w:ins>/g;
const DEL_TAG = /<w:del\b([^>]*)>([\s\S]*?)<\/w:del>/g;
const TEXT_TAG = /<w:t[^>]*>([^<]*)<\/w:t>/g;

function readAttr(attrs: string, localName: string): string | null {
  for (const prefix of [`w:${localName}="`, `${localName}="`]) {
    const idx = attrs.indexOf(prefix);
    if (idx === -1) continue;
    const start = idx + prefix.length;
    const end = attrs.indexOf('"', start);
    if (end === -1) continue;
    return attrs.slice(start, end);
  }
  return null;
}

function plainTextFromFragment(fragment: string): string {
  const parts: string[] = [];
  for (const match of fragment.matchAll(TEXT_TAG)) {
    parts.push(match[1] ?? "");
  }
  return parts.join("");
}

/** Parse w:ins / w:del spans into suggestion marks (D03 read path stub). */
export function parseReviewSuggestionMarksFromDocumentXml(xml: string): ReviewSuggestionMarkStub[] {
  const marks: ReviewSuggestionMarkStub[] = [];
  for (const match of xml.matchAll(INS_TAG)) {
    const attrs = match[1] ?? "";
    const suggestionId = readAttr(attrs, "id");
    if (!suggestionId) continue;
    marks.push({
      suggestionId,
      kind: "insert",
      text: plainTextFromFragment(match[2] ?? ""),
    });
  }
  for (const match of xml.matchAll(DEL_TAG)) {
    const attrs = match[1] ?? "";
    const suggestionId = readAttr(attrs, "id");
    if (!suggestionId) continue;
    marks.push({
      suggestionId,
      kind: "delete",
      text: plainTextFromFragment(match[2] ?? ""),
    });
  }
  return marks.sort((a, b) => a.suggestionId.localeCompare(b.suggestionId));
}

function plainTextFromMarks(marks: readonly ReviewSuggestionMarkStub[]): string {
  const inserts = marks.filter((m) => m.kind === "insert").map((m) => m.text);
  const deletes = marks.filter((m) => m.kind === "delete").map((m) => m.text);
  return [...inserts, ...deletes].join("");
}

function applyDecisionToMarks(
  marks: readonly ReviewSuggestionMarkStub[],
  suggestionId: string,
  decision: ReviewSuggestionDecision,
): ReviewSuggestionMarkStub[] | null {
  const target = marks.find((m) => m.suggestionId === suggestionId);
  if (!target) return null;
  const rest = marks.filter((m) => m.suggestionId !== suggestionId);
  if (decision === "accept") {
    if (target.kind === "insert") return rest;
    return rest.filter((m) => !(m.kind === "delete" && m.text === target.text));
  }
  if (target.kind === "insert") {
    return rest;
  }
  return [...rest, { ...target, kind: "insert" as const }];
}

/** Accept/reject one suggestion mark (in-memory ledger; gate not-run). */
export function applyReviewSuggestionDecisionStub(
  marks: readonly ReviewSuggestionMarkStub[],
  suggestionId: string,
  decision: ReviewSuggestionDecision,
): ReviewSuggestionDecisionResult {
  const next = applyDecisionToMarks(marks, suggestionId, decision);
  return {
    featureId: REVIEW_SUGGESTION_FEATURE_REGISTRY_ID,
    suggestionId,
    decision,
    applied: next !== null,
    remainingMarks: next ?? [...marks],
    resultingPlainText: plainTextFromMarks(next ?? marks),
  };
}
