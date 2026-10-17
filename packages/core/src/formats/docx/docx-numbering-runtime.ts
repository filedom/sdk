import type { ListParagraphMeta } from "./docx-list-numbering-stub.js";

/** G2-DOCX-09: runtime list markers from numbering.xml (subset — not full Word). */

export type WordNumFmt = "decimal" | "bullet" | "lowerLetter" | "upperLetter" | "upperRoman" | string;

export interface ParsedNumberingLevel {
  ilvl: number;
  numFmt: WordNumFmt;
  lvlText: string;
  start: number;
  restartAfterIlvl?: number;
}

export interface ParsedWordNumbering {
  abstractNums: Map<number, ParsedNumberingLevel[]>;
  numToAbstract: Map<number, number>;
}

function parseLevelsFromAbstractBlock(block: string): ParsedNumberingLevel[] {
  const levels: ParsedNumberingLevel[] = [];
  const lvlRe = /<w:lvl[^>]*\sw:ilvl="(\d+)"[^>]*>([\s\S]*?)<\/w:lvl>/g;
  let match: RegExpExecArray | null;
  while ((match = lvlRe.exec(block)) !== null) {
    const inner = match[2] ?? "";
    const ilvl = Number(match[1]);
    const numFmt = inner.match(/<w:numFmt[^>]*\sw:val="([^"]+)"/)?.[1] ?? "decimal";
    const lvlText = inner.match(/<w:lvlText[^>]*\sw:val="([^"]*)"/)?.[1] ?? "%1.";
    const start = Number(inner.match(/<w:start[^>]*\sw:val="(\d+)"/)?.[1] ?? "1");
    const restartRaw = inner.match(/<w:lvlRestart[^>]*\sw:val="(\d+)"/)?.[1];
    levels.push({
      ilvl,
      numFmt,
      lvlText: lvlText.replace(/&quot;/g, '"'),
      start,
      restartAfterIlvl: restartRaw !== undefined ? Number(restartRaw) : undefined,
    });
  }
  return levels.sort((a, b) => a.ilvl - b.ilvl);
}

export function parseWordNumberingXml(xml: string): ParsedWordNumbering {
  const abstractNums = new Map<number, ParsedNumberingLevel[]>();
  const abstractRe = /<w:abstractNum[^>]*\sw:abstractNumId="(\d+)"[^>]*>([\s\S]*?)<\/w:abstractNum>/g;
  let absMatch: RegExpExecArray | null;
  while ((absMatch = abstractRe.exec(xml)) !== null) {
    abstractNums.set(Number(absMatch[1]), parseLevelsFromAbstractBlock(absMatch[2] ?? ""));
  }
  const numToAbstract = new Map<number, number>();
  const numRe = /<w:num[^>]*\sw:numId="(\d+)"[^>]*>([\s\S]*?)<\/w:num>/g;
  let numMatch: RegExpExecArray | null;
  while ((numMatch = numRe.exec(xml)) !== null) {
    const abstractId = Number(
      (numMatch[2] ?? "").match(/<w:abstractNumId[^>]*\sw:val="(\d+)"/)?.[1] ?? "-1",
    );
    if (abstractId >= 0) numToAbstract.set(Number(numMatch[1]), abstractId);
  }
  return { abstractNums, numToAbstract };
}

function toRoman(n: number): string {
  const pairs: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let x = n;
  let out = "";
  for (const [v, s] of pairs) {
    while (x >= v) {
      out += s;
      x -= v;
    }
  }
  return out;
}

function formatCounter(value: number, numFmt: WordNumFmt): string {
  switch (numFmt) {
    case "decimal":
      return String(value);
    case "lowerLetter":
      return String.fromCharCode(96 + Math.max(1, Math.min(26, value)));
    case "upperLetter":
      return String.fromCharCode(64 + Math.max(1, Math.min(26, value)));
    case "upperRoman":
      return toRoman(value);
    case "bullet":
      return "";
    default:
      return String(value);
  }
}

function renderLvlText(
  template: string,
  counters: readonly number[],
  levels: readonly ParsedNumberingLevel[],
): string {
  return template.replace(/%(\d+)/g, (_m, digit: string) => {
    const ilvl = Number(digit) - 1;
    const level = levels.find((l) => l.ilvl === ilvl);
    const counter = counters[ilvl] ?? level?.start ?? 1;
    if (!level) return String(counter);
    const formatted = formatCounter(counter, level.numFmt);
    if (level.numFmt === "bullet" && !formatted) {
      return level.lvlText.replace(/%\d+/g, "").trim() || level.lvlText;
    }
    return formatted;
  });
}

function markerSuffix(lvlText: string): string {
  return lvlText.endsWith(" ") ? "" : lvlText.match(/[.)]$/) ? " " : " ";
}

/** Compute display markers using numbering.xml defs when numId is set. */
export function computeListMarkersFromNumberingXml(
  paragraphs: readonly ListParagraphMeta[],
  numberingXml: string | undefined,
): readonly string[] {
  if (!numberingXml?.includes("<w:numbering")) {
    return paragraphs.map((p) => (p.numId ? `${p.numId}. ` : ""));
  }
  const parsed = parseWordNumberingXml(numberingXml);
  const countersByNum = new Map<number, number[]>();
  const lastIlvlByNum = new Map<number, number>();

  return paragraphs.map((p) => {
    if (!p.numId) return "";
    const abstractId = parsed.numToAbstract.get(p.numId);
    const levels = abstractId !== undefined ? parsed.abstractNums.get(abstractId) : undefined;
    if (!levels?.length) return `${p.numId}. `;

    let counters = countersByNum.get(p.numId);
    if (!counters) {
      counters = levels.map((l) => l.start - 1);
      countersByNum.set(p.numId, counters);
    }

    const prevIlvl = lastIlvlByNum.get(p.numId);
    if (prevIlvl !== undefined && p.ilvl < prevIlvl) {
      for (let i = p.ilvl + 1; i < counters.length; i++) {
        counters[i] = (levels[i]?.start ?? 1) - 1;
      }
    }
    lastIlvlByNum.set(p.numId, p.ilvl);

    const levelDef = levels.find((l) => l.ilvl === p.ilvl) ?? levels[0]!;
    counters[p.ilvl] = (counters[p.ilvl] ?? levelDef.start - 1) + 1;

    const rendered = renderLvlText(levelDef.lvlText, counters, levels);
    if (levelDef.numFmt === "bullet" && !levelDef.lvlText.includes("%")) {
      return `${levelDef.lvlText.trim()} `;
    }
    return rendered + markerSuffix(rendered);
  });
}
