import type { OpcPackage } from "./opc-package.js";
import { getMemberUtf8, setMemberUtf8 } from "./opc-package.js";
import type { DocxListRenumberMutation } from "./docx-session-list-mutation.js";
import { DOCX_NUMBERING_PART, patchNumberingXmlForListRenumber } from "./docx-numbering-opc-patch.js";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

/** G2-DOCX-08: Word-oriented level definition (subset — not full Word compat). */
export interface WordNumberingLevelDef {
  ilvl: number;
  numFmt: "decimal" | "bullet" | "lowerLetter" | "upperRoman";
  lvlText: string;
  start?: number;
  /** Restart after this ilvl (w:lvlRestart w:val). */
  restartAfterIlvl?: number;
  /** w:ind w:left (twips) — G2-DOCX-15 subset. */
  leftIndentTwips?: number;
  /** w:ind w:hanging (twips). */
  hangingIndentTwips?: number;
}

export function buildWordCompatibleNumberingXml(
  numId: number,
  levels: readonly WordNumberingLevelDef[],
): string {
  const abstractNumId = Math.max(0, numId - 1);
  const lvlBlocks = levels
    .map((level) => {
      const escaped = level.lvlText.replace(/"/g, "&quot;");
      const start = level.start ?? 1;
      const restart =
        level.restartAfterIlvl !== undefined
          ? `\n      <w:lvlRestart w:val="${level.restartAfterIlvl}"/>`
          : "";
      const ind =
        level.leftIndentTwips !== undefined || level.hangingIndentTwips !== undefined
          ? `\n      <w:ind w:left="${level.leftIndentTwips ?? 0}" w:hanging="${level.hangingIndentTwips ?? 0}"/>`
          : "";
      return `    <w:lvl w:ilvl="${level.ilvl}">
      <w:start w:val="${start}"/>
      <w:numFmt w:val="${level.numFmt}"/>
      <w:lvlText w:val="${escaped}"/>
      <w:lvlJc w:val="left"/>${ind}${restart}
    </w:lvl>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="${W_NS}">
  <w:abstractNum w:abstractNumId="${abstractNumId}">
${lvlBlocks}
  </w:abstractNum>
  <w:num w:numId="${numId}">
    <w:abstractNumId w:val="${abstractNumId}"/>
  </w:num>
</w:numbering>`;
}

export function parseNumberingAbstractNumIds(xml: string): number[] {
  const ids: number[] = [];
  const re = /<w:abstractNum[^>]*\sw:abstractNumId="(\d+)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    ids.push(Number(match[1]));
  }
  return ids;
}

/** G2-DOCX-07: minimal OOXML numbering defs (decimal level text) for round-trip slice. */
export function buildNumberingXmlWithListDef(numId: number, levelTextTemplate: string): string {
  return buildWordCompatibleNumberingXml(numId, [
    { ilvl: 0, numFmt: "decimal", lvlText: levelTextTemplate, start: 1 },
  ]);
}

export function parseNumberingNumIds(xml: string): number[] {
  const ids: number[] = [];
  const re = /<w:num[^>]*\sw:numId="(\d+)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    ids.push(Number(match[1]));
  }
  return ids;
}

export function mergeListRenumberIntoNumberingXml(
  xml: string,
  mutation: DocxListRenumberMutation,
): string {
  const withDefs = xml.includes("<w:abstractNum")
    ? xml
    : buildNumberingXmlWithListDef(mutation.numId, "%1.");
  return patchNumberingXmlForListRenumber(withDefs, mutation);
}

/** Apply list renumber with OOXML numbering part seed/update (not Word-compat complete). */
export function applyListRenumberWithOoxmlDefinitions(
  pkg: OpcPackage,
  mutation: DocxListRenumberMutation,
): OpcPackage {
  const members = new Map(pkg.members);
  const patched: OpcPackage = { members };
  let xml = buildNumberingXmlWithListDef(mutation.numId, "%1.");
  try {
    xml = getMemberUtf8(patched, DOCX_NUMBERING_PART);
  } catch {
    /* seed */
  }
  setMemberUtf8(
    patched,
    DOCX_NUMBERING_PART,
    mergeListRenumberIntoNumberingXml(xml, mutation),
  );
  return patched;
}
