import { describe, expect, it } from "vitest";
import {
  buildWordCompatibleNumberingXml,
} from "./docx-numbering-ooxml-roundtrip.js";
import {
  computeListMarkersFromNumberingXml,
  parseWordNumberingXml,
} from "./docx-numbering-runtime.js";
import type { ListParagraphMeta } from "./docx-list-numbering-stub.js";

describe("G2-DOCX-09 numbering.xml runtime markers", () => {
  it("parses abstract nums and num instances", () => {
    const xml = buildWordCompatibleNumberingXml(2, [
      { ilvl: 0, numFmt: "decimal", lvlText: "%1.", start: 1 },
    ]);
    const parsed = parseWordNumberingXml(xml);
    expect(parsed.numToAbstract.get(2)).toBe(1);
    expect(parsed.abstractNums.get(1)?.[0]?.lvlText).toBe("%1.");
  });

  it("renders bullet and nested decimal markers from defs", () => {
    const bulletXml = buildWordCompatibleNumberingXml(2, [
      { ilvl: 0, numFmt: "bullet", lvlText: "•", start: 1 },
    ]);
    const nestedXml = buildWordCompatibleNumberingXml(4, [
      { ilvl: 0, numFmt: "decimal", lvlText: "%1.", start: 1 },
      { ilvl: 1, numFmt: "lowerLetter", lvlText: "%2.", start: 1, restartAfterIlvl: 0 },
    ]);
    const bulletParas: ListParagraphMeta[] = [{ text: "x", numId: 2, ilvl: 0 }];
    expect(computeListMarkersFromNumberingXml(bulletParas, bulletXml)).toEqual(["• "]);

    const nestedParas: ListParagraphMeta[] = [{ text: "y", numId: 4, ilvl: 1 }];
    expect(computeListMarkersFromNumberingXml(nestedParas, nestedXml)).toEqual(["a. "]);
  });

  it("G2-DOCX-10 multi-paragraph chain and nested restart", () => {
    const xml = buildWordCompatibleNumberingXml(5, [
      { ilvl: 0, numFmt: "decimal", lvlText: "%1.", start: 1 },
      { ilvl: 1, numFmt: "lowerLetter", lvlText: "%2.", start: 1, restartAfterIlvl: 0 },
    ]);
    const chain: ListParagraphMeta[] = [
      { text: "a", numId: 5, ilvl: 0 },
      { text: "b", numId: 5, ilvl: 1 },
      { text: "c", numId: 5, ilvl: 0 },
    ];
    expect(computeListMarkersFromNumberingXml(chain, xml)).toEqual(["1. ", "a. ", "2. "]);
  });

  it("G2-DOCX-10 applies left indent prefix from w:ind", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
      <w:ind w:left="1440" w:hanging="360"/>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="3"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`;
    const paras: ListParagraphMeta[] = [{ text: "x", numId: 3, ilvl: 0 }];
    expect(computeListMarkersFromNumberingXml(paras, xml)[0]?.startsWith("\u2003\u2003")).toBe(true);
  });
});
