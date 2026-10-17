import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { createEngineClient } from "../../rendering/engine-client.js";
import { buildRenderProjectionFromDocxFlow } from "./docx-flow-projection.js";
import { DocxStore } from "./docx-store.js";

function buildMinimalDocx(paragraphText: string): Uint8Array {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>${paragraphText}</w:t></w:r></w:p></w:body>
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

describe("G2 vertical: docx store → flow layout → render", () => {
  it("wraps long DOCX paragraph and renders geometry for each line run", async () => {
    const wasm = await import("domdoc-wasm");
    const longText =
      "one two three four five six seven eight nine ten eleven twelve";
    const store = DocxStore.open(buildMinimalDocx(longText));
    const body = store.getBody();

    const projection = buildRenderProjectionFromDocxFlow(body, {
      requestId: "g2-vertical",
      sessionId: "sess-g2",
      documentGeneration: 2,
      maxTextWidthPt: 48,
      fontSizePt: 10,
      layoutParagraph(input) {
        const json = wasm.layout_flow_paragraph_json(JSON.stringify(input));
        if (typeof json !== "string") {
          throw new Error(String(json));
        }
        return JSON.parse(json) as {
          line_index: number;
          text: string;
          width_pt: number;
          baseline_y_pt: number;
        }[];
      },
    });

    expect(projection.pages[0]?.runs.length).toBeGreaterThan(1);

    const client = await createEngineClient();
    const response = await client.render(projection);
    expect(response.geometry.pages[0]?.runBounds.length).toBe(
      projection.pages[0]?.runs.length,
    );
    expect(response.paint.items.length).toBeGreaterThan(0);
    await client.dispose();
  });
});
