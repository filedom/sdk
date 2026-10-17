import { zipSync } from "fflate";

/** Minimal tracked-change DOCX for F34 / M3 review OPC patch integration tests. */
export const REVIEW_MINIMAL_TRACKED_DOCUMENT_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t>Hello </w:t></w:r>
      <w:ins w:id="10" w:author="Reviewer" w:date="2026-01-01T00:00:00Z">
        <w:r><w:t>world</w:t></w:r>
      </w:ins>
    </w:p>
  </w:body>
</w:document>`;

/** OPC ZIP with [Content_Types], rels, and tracked document.xml (real minimal fixture). */
export function buildReviewMinimalTrackedDocxZipBytes(): Uint8Array {
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
      "word/document.xml": new TextEncoder().encode(REVIEW_MINIMAL_TRACKED_DOCUMENT_XML),
    },
    { level: 0 },
  );
}
