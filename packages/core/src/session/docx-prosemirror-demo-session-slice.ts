import { zipSync } from "fflate";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import type { DocumentSessionStub } from "../wire/domain-owned.js";
import { DocxStore } from "../formats/docx/docx-store.js";
import {
  buildProseMirrorDocFromOoxmlBody,
  docxProjectionSchema,
} from "../formats/docx/docx-prosemirror-projection.js";
import { prosemirrorDocToTransactionStub } from "../formats/docx/docx-prosemirror-transaction-boundary.js";
import { createDocumentSession, type DocumentSession } from "./document-session.js";

/** M1/M3 demo slice: editable first paragraph bound to DocumentSession revision stub. */
export const PROSEMIRROR_DEMO_SLICE_FEATURE_ID = "F21" as const;

export interface DocxProsemirrorDemoSessionSlice {
  featureId: typeof PROSEMIRROR_DEMO_SLICE_FEATURE_ID;
  session: DocumentSession;
  store: DocxStore;
  doc: ProseMirrorNode;
}

export function openDocxProsemirrorDemoSessionSlice(
  zipBytes: Uint8Array,
  sessionStub: DocumentSessionStub,
): DocxProsemirrorDemoSessionSlice {
  const store = DocxStore.open(zipBytes);
  const doc = buildProseMirrorDocFromOoxmlBody(
    store.getBody(),
    store.tryGetNumberingXml(),
  );
  return {
    featureId: PROSEMIRROR_DEMO_SLICE_FEATURE_ID,
    session: createDocumentSession(sessionStub),
    store,
    doc,
  };
}

/** Build a one-paragraph synthetic doc for browser demo bootstrap. */
export function buildDemoDocxZipBytes(initialText: string): Uint8Array {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>${initialText.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</w:t></w:r></w:p></w:body>
</w:document>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  return zipSync(
    {
      "[Content_Types].xml": new TextEncoder().encode(contentTypes),
      "_rels/.rels": new TextEncoder().encode(rels),
      "word/document.xml": new TextEncoder().encode(documentXml),
    },
    { level: 0 },
  );
}

/** Apply text edit using prosemirror-model replace on first paragraph (editable path). */
export function applyDemoProsemirrorTextReplace(
  slice: DocxProsemirrorDemoSessionSlice,
  paragraphIndex: number,
  newText: string,
): DocxProsemirrorDemoSessionSlice {
  const paragraph = slice.doc.child(paragraphIndex);
  if (!paragraph || paragraph.type.name !== "paragraph") {
    return slice;
  }
  const inline = newText ? docxProjectionSchema.text(newText) : undefined;
  const replaced = docxProjectionSchema.nodes.paragraph.create(paragraph.attrs, inline);
  const children: ProseMirrorNode[] = [];
  slice.doc.forEach((node, _offset, index) => {
    children.push(index === paragraphIndex ? replaced : node);
  });
  const doc = docxProjectionSchema.nodes.doc.create(null, children);
  const ooxmlId = String(paragraph.attrs.ooxmlId ?? "");
  if (ooxmlId) {
    slice.store.patchParagraph(ooxmlId, newText);
  }
  const targetRevision = slice.session.revisions.committedRevision + 1;
  const session = slice.session.commitDocxProjectionStub(
    prosemirrorDocToTransactionStub(doc, targetRevision),
  );
  return { ...slice, session, doc };
}
