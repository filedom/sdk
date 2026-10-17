/** F09 selection copy: plain text from paragraph ranges (rich clipboard later). */

export interface TextSelection {
  paragraphIndex: number;
  start: number;
  end: number;
}

export function selectedPlainText(
  paragraphTexts: readonly string[],
  selection: TextSelection,
): string {
  const text = paragraphTexts[selection.paragraphIndex] ?? "";
  const start = Math.max(0, Math.min(selection.start, selection.end));
  const end = Math.min(text.length, Math.max(selection.start, selection.end));
  return text.slice(start, end);
}

export function copySelectionToClipboardData(
  paragraphTexts: readonly string[],
  selection: TextSelection,
): { "text/plain": string } {
  return { "text/plain": selectedPlainText(paragraphTexts, selection) };
}
