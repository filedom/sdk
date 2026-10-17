/** F11 document search over committed paragraph texts (story scope). */

export interface DocumentSearchHit {
  paragraphIndex: number;
  start: number;
  end: number;
  snippet: string;
}

export interface DocumentSearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
}

export interface DocumentSearchIndex {
  paragraphTexts: readonly string[];
}

function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && /[\p{L}\p{N}_]/u.test(ch);
}

function isWholeWord(text: string, start: number, end: number): boolean {
  const before = start > 0 ? text[start - 1] : undefined;
  const after = end < text.length ? text[end] : undefined;
  return !isWordChar(before) && !isWordChar(after);
}

export function searchDocumentParagraphs(
  index: DocumentSearchIndex,
  query: string,
  options: DocumentSearchOptions = {},
): readonly DocumentSearchHit[] {
  if (!query) return [];
  const hits: DocumentSearchHit[] = [];
  for (const [paragraphIndex, raw] of index.paragraphTexts.entries()) {
    const text = options.caseSensitive ? raw : raw.toLowerCase();
    const needle = options.caseSensitive ? query : query.toLowerCase();
    let from = 0;
    while (from <= text.length) {
      const start = text.indexOf(needle, from);
      if (start < 0) break;
      const end = start + needle.length;
      if (!options.wholeWord || isWholeWord(text, start, end)) {
        const snippetStart = Math.max(0, start - 12);
        const snippetEnd = Math.min(raw.length, end + 12);
        hits.push({
          paragraphIndex,
          start,
          end,
          snippet: raw.slice(snippetStart, snippetEnd),
        });
      }
      from = start + Math.max(1, needle.length);
    }
  }
  return hits;
}

export function nextSearchHit(
  hits: readonly DocumentSearchHit[],
  currentIndex: number,
): DocumentSearchHit | undefined {
  if (hits.length === 0) return undefined;
  return hits[(currentIndex + 1) % hits.length];
}

export function previousSearchHit(
  hits: readonly DocumentSearchHit[],
  currentIndex: number,
): DocumentSearchHit | undefined {
  if (hits.length === 0) return undefined;
  return hits[(currentIndex - 1 + hits.length) % hits.length];
}
