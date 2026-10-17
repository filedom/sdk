import { searchDocumentParagraphs, type DocumentSearchOptions } from "./document-search.js";

/** F140 find/replace over paragraph texts with native-index mapping (story scope). */

export interface FindReplaceResult {
  paragraphTexts: readonly string[];
  replacementCount: number;
}

export function replaceDocumentParagraphs(
  paragraphTexts: readonly string[],
  query: string,
  replacement: string,
  options: DocumentSearchOptions = {},
): FindReplaceResult {
  const hits = searchDocumentParagraphs({ paragraphTexts }, query, options);
  if (hits.length === 0) {
    return { paragraphTexts: [...paragraphTexts], replacementCount: 0 };
  }
  const next = paragraphTexts.map((text, paragraphIndex) => {
    const local = hits.filter((h) => h.paragraphIndex === paragraphIndex);
    if (local.length === 0) return text;
    let rebuilt = "";
    let cursor = 0;
    for (const hit of local) {
      rebuilt += text.slice(cursor, hit.start) + replacement;
      cursor = hit.end;
    }
    rebuilt += text.slice(cursor);
    return rebuilt;
  });
  return { paragraphTexts: next, replacementCount: hits.length };
}
