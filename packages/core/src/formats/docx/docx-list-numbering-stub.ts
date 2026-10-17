import type { OoxmlNode } from "./ooxml-tree.js";

export interface ListParagraphMeta {
  readonly text: string;
  readonly numId: number;
  readonly ilvl: number;
}

export function listMetaFromParagraph(paragraph: OoxmlNode): ListParagraphMeta {
  const text =
    paragraph.children
      ?.filter((c) => c.kind === "text")
      .map((c) => c.text ?? "")
      .join("") ?? "";
  const numId = Number(paragraph.attributes?.listNumId ?? "0");
  const ilvl = Number(paragraph.attributes?.listIlvl ?? "0");
  return { text, numId, ilvl };
}

/** Deterministic decimal markers per (numId, ilvl) — not Word-compatible layout (G2 stub). */
export function computeListMarkers(paragraphs: readonly ListParagraphMeta[]): readonly string[] {
  const counters = new Map<string, number>();
  return paragraphs.map((p) => {
    if (!p.numId) return "";
    const key = `${p.numId}:${p.ilvl}`;
    const next = (counters.get(key) ?? 0) + 1;
    counters.set(key, next);
    return `${next}. `;
  });
}
