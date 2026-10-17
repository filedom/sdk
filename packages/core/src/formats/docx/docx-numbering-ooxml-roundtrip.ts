import type { OpcPackage } from "./opc-package.js";
import { getMemberUtf8, setMemberUtf8 } from "./opc-package.js";
import type { DocxListRenumberMutation } from "./docx-session-list-mutation.js";
import { DOCX_NUMBERING_PART, patchNumberingXmlForListRenumber } from "./docx-numbering-opc-patch.js";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

/** G2-DOCX-07: minimal OOXML numbering defs (decimal level text) for round-trip slice. */
export function buildNumberingXmlWithListDef(numId: number, levelTextTemplate: string): string {
  const abstractNumId = Math.max(0, numId - 1);
  const escapedLevel = levelTextTemplate.replace(/"/g, "&quot;");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="${W_NS}">
  <w:abstractNum w:abstractNumId="${abstractNumId}">
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="${escapedLevel}"/>
      <w:lvlJc w:val="left"/>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="${numId}">
    <w:abstractNumId w:val="${abstractNumId}"/>
  </w:num>
</w:numbering>`;
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
