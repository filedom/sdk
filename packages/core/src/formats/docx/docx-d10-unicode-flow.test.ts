import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { DocxStore } from "./docx-store.js";
import { buildRenderProjectionFromDocxFlow } from "./docx-flow-projection.js";

describe("D10 unicode/bidi/emoji through WASM flow", () => {
  it("preserves CJK, emoji, and Arabic letters in laid-out run text", async () => {
    const wasm = await import("domdoc-wasm");
    const text = "你好🌍مرحبا";
    const zip = zipSync({
      "[Content_Types].xml": new TextEncoder().encode(
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`,
      ),
      "_rels/.rels": new TextEncoder().encode(
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,
      ),
      "word/document.xml": new TextEncoder().encode(
        `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`,
      ),
    });
    const store = DocxStore.open(zip);
    const projection = buildRenderProjectionFromDocxFlow(store.getBody(), {
      requestId: "d10",
      sessionId: "sess-d10",
      documentGeneration: 1,
      maxTextWidthPt: 200,
      fontSizePt: 12,
      layoutParagraph(input) {
        const json = wasm.layout_flow_paragraph_json(JSON.stringify(input));
        if (typeof json !== "string") throw new Error(String(json));
        return JSON.parse(json) as {
          line_index: number;
          text: string;
          width_pt: number;
          baseline_y_pt: number;
        }[];
      },
    });
    const laidOut = projection.pages[0]?.runs.map((r) => r.text).join("") ?? "";
    expect(laidOut).toContain("你好");
    expect(laidOut).toContain("🌍");
    expect(laidOut).toContain("مرحبا");
  });
});
