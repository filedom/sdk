import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { createDocumentSession } from "../../session/document-session.js";
import {
  buildProseMirrorDocFromOoxmlBody,
  proseMirrorParagraphTexts,
} from "./docx-prosemirror-projection.js";
import { exportDocxFromStoreStub } from "./docx-export-stub.js";
import {
  DOCX_IMPORT_MINIMAL_DETECTION_FEATURE_ID,
  DOCX_IMPORT_MINIMAL_VIEW_TRANSFORM_FEATURE_ID,
  importDocxStoreFromExportedBytes,
} from "./docx-import-minimal.js";
import { DocxStore } from "./docx-store.js";
import { fitPageZoom } from "../../compositor/view-transform.js";

function minimalDocx(text: string): Uint8Array {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body>
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

describe("G2 docx import minimal path (F02/F07)", () => {
  it("loads exported bytes back into DocxStore with F02 magic detection", () => {
    const store = DocxStore.open(minimalDocx("import-round-trip"));
    const session = createDocumentSession({
      documentId: "g2-import",
      kind: "flow",
      revisions: {
        committedRevision: 1,
        persistedRevision: 1,
        materializedRevision: 1,
        exportedRevision: 0,
        sharedRevision: null,
        renderedRevision: 1,
      },
    });
    const { result: exported } = exportDocxFromStoreStub(store, session);
    expect(exported.roundTripOpcOk).toBe(true);

    const imported = importDocxStoreFromExportedBytes(exported.zipBytes, {
      filename: "exported.docx",
    });
    expect(imported.ok).toBe(true);
    expect(imported.detection.kind).toBe("docx");
    expect(imported.detection.confidence).toBe("magic");
    expect(imported.detail).toBe("docx-store-opened");
    expect(imported.store).not.toBeNull();

    const texts = proseMirrorParagraphTexts(
      buildProseMirrorDocFromOoxmlBody(imported.store!.getBody()),
    );
    expect(texts).toEqual(["import-round-trip"]);
    expect(DOCX_IMPORT_MINIMAL_DETECTION_FEATURE_ID).toBe("F02");
  });

  it("reports stable F07 fit-page zoom (layout remains in points)", () => {
    const expectedZoom = fitPageZoom({
      pageWidthPt: 612,
      pageHeightPt: 792,
      rotationDeg: 0,
      viewportWidthCssPx: 800,
      viewportHeightCssPx: 600,
    });
    const imported = importDocxStoreFromExportedBytes(minimalDocx("f07-zoom"));
    expect(imported.fitPageZoom).toBe(expectedZoom);
    expect(DOCX_IMPORT_MINIMAL_VIEW_TRANSFORM_FEATURE_ID).toBe("F07");
  });
});
