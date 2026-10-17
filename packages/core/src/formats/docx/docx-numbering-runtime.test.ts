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
});
