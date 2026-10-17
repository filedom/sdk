import type { OpcPackage } from "./opc-package.js";
import { getMemberUtf8, setMemberUtf8 } from "./opc-package.js";
import type { DocxListRenumberMutation } from "./docx-session-list-mutation.js";

export const DOCX_NUMBERING_PART = "word/numbering.xml" as const;

const MINIMAL_NUMBERING_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
</w:numbering>`;

/** G2-DOCX-06: deterministic numbering.xml annotation before full OOXML list defs. */
export function patchNumberingXmlForListRenumber(
  xml: string,
  mutation: DocxListRenumberMutation,
): string {
  const escaped = mutation.markers.map((m) => m.replace(/"/g, "&quot;")).join("|");
  const marker = `<!-- domdoc:list-renumber numId="${mutation.numId}" markers="${escaped}" -->`;
  if (xml.includes("</w:numbering>")) {
    return xml.replace("</w:numbering>", `  ${marker}\n</w:numbering>`);
  }
  return `${xml.trim()}\n${marker}\n`;
}

export function applyListRenumberToOpcPackage(
  pkg: OpcPackage,
  mutation: DocxListRenumberMutation,
): OpcPackage {
  const members = new Map(pkg.members);
  const patched: OpcPackage = { members };
  let xml = MINIMAL_NUMBERING_XML;
  try {
    xml = getMemberUtf8(patched, DOCX_NUMBERING_PART);
  } catch {
    /* seed minimal numbering part */
  }
  setMemberUtf8(patched, DOCX_NUMBERING_PART, patchNumberingXmlForListRenumber(xml, mutation));
  return patched;
}
