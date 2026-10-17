import type { OpcPackage } from "./opc-package.js";
import { getMemberUtf8, setMemberUtf8 } from "./opc-package.js";
import type { ListParagraphMeta } from "./docx-list-numbering-stub.js";
import {
  parseDocumentBodyXml,
  serializeDocumentXmlWithListMeta,
  type OoxmlNode,
} from "./ooxml-tree.js";
import {
  writeNumberingOpcFromSessionListState,
  type DocxNumberingSessionWriteBackOptions,
} from "./docx-numbering-session-writeback.js";

const DOCX_DOCUMENT_PART = "word/document.xml";

/** G2-DOCX-12: merge session list meta into parsed body (by paragraph index). */
export function applyListParagraphMetaToDocumentBody(
  body: OoxmlNode,
  paragraphs: readonly ListParagraphMeta[],
): OoxmlNode {
  const children = body.children ?? [];
  const nextChildren = children.map((node, index) => {
    const meta = paragraphs[index];
    if (!meta) return node;
    const attributes: Record<string, string> = { ...(node.attributes ?? {}) };
    if (meta.numId > 0) {
      attributes.listNumId = String(meta.numId);
      attributes.listIlvl = String(meta.ilvl);
    } else {
      delete attributes.listNumId;
      delete attributes.listIlvl;
    }
    const hasAttrs = Object.keys(attributes).length > 0;
    return {
      ...node,
      attributes: hasAttrs ? attributes : undefined,
      children: [{ id: node.id, kind: "text" as const, text: meta.text }],
    };
  });
  return { ...body, children: nextChildren };
}

/** Write `w:numPr` on body paragraphs from session list state (numbering.xml unchanged). */
export function writeBodyNumPrFromSessionListState(
  pkg: OpcPackage,
  paragraphs: readonly ListParagraphMeta[],
): OpcPackage {
  if (!paragraphs.length) return pkg;
  let documentXml: string;
  let body: OoxmlNode;
  try {
    documentXml = getMemberUtf8(pkg, DOCX_DOCUMENT_PART);
    body = applyListParagraphMetaToDocumentBody(parseDocumentBodyXml(documentXml), paragraphs);
  } catch {
    body = applyListParagraphMetaToDocumentBody(
      { id: "body", kind: "element", name: "w:body", children: [] },
      paragraphs,
    );
  }
  const next: OpcPackage = { members: new Map(pkg.members) };
  setMemberUtf8(next, DOCX_DOCUMENT_PART, serializeDocumentXmlWithListMeta(body));
  return next;
}

/** G2-DOCX-12: numbering.xml + body `w:numPr` write-back from session list paragraphs. */
export function applyDocxNumberingWriteBackFromSession(
  pkg: OpcPackage,
  paragraphs: readonly ListParagraphMeta[],
  options?: DocxNumberingSessionWriteBackOptions,
): OpcPackage {
  const withNumbering = writeNumberingOpcFromSessionListState(pkg, paragraphs, options);
  return writeBodyNumPrFromSessionListState(withNumbering, paragraphs);
}

export function readBodyNumPrFromDocumentXml(documentXml: string): Array<{ numId: number; ilvl: number }> {
  const body = parseDocumentBodyXml(documentXml);
  return (body.children ?? []).map((p) => ({
    numId: Number(p.attributes?.listNumId ?? "0"),
    ilvl: Number(p.attributes?.listIlvl ?? "0"),
  }));
}
