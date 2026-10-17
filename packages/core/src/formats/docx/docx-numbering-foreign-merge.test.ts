import { describe, expect, it } from "vitest";
import {
  buildWordCompatibleNumberingXml,
  buildWordCompatibleSharedAbstractNumberingXml,
  parseNumberingAbstractNumIds,
  parseNumberingNumIds,
} from "./docx-numbering-ooxml-roundtrip.js";
import {
  DOCX_NUMBERING_FEATURE_REGISTRY_ID,
  mergeForeignNumberingPart,
} from "./docx-numbering-foreign-merge.js";

describe("G2-DOCX-20 foreign numbering merge", () => {
  it("binds foreign numbering merge to feature registry F07", () => {
    expect(DOCX_NUMBERING_FEATURE_REGISTRY_ID).toBe("F07");
  });
  it("D05-DRT-12 reallocates colliding numId and abstractNumId on foreign merge", () => {
    const base = buildWordCompatibleNumberingXml(2, [
      { ilvl: 0, numFmt: "decimal", lvlText: "%1.", start: 1 },
    ]);
    const foreign = buildWordCompatibleNumberingXml(2, [
      { ilvl: 0, numFmt: "bullet", lvlText: "•", start: 1 },
    ]);
    const merged = mergeForeignNumberingPart(base, foreign);
    const numIds = parseNumberingNumIds(merged.numberingXml).sort((a, b) => a - b);
    expect(numIds).toEqual([2, 3]);
    expect(merged.numIdRemap[2]).toBe(3);
    expect(merged.numberingXml).toContain('numFmt w:val="decimal"');
    expect(merged.numberingXml).toContain('numFmt w:val="bullet"');
    const abstractIds = parseNumberingAbstractNumIds(merged.numberingXml).sort((a, b) => a - b);
    expect(abstractIds.length).toBe(2);
  });

  it("preserves shared-abstract foreign num when base has free numId", () => {
    const base = buildWordCompatibleSharedAbstractNumberingXml(
      5,
      [{ ilvl: 0, numFmt: "decimal", lvlText: "%1.", start: 1 }],
      [12, 13],
    );
    const foreign = buildWordCompatibleNumberingXml(14, [
      { ilvl: 0, numFmt: "lowerLetter", lvlText: "%1.", start: 1 },
    ]);
    const merged = mergeForeignNumberingPart(base, foreign);
    expect(parseNumberingNumIds(merged.numberingXml).sort((a, b) => a - b)).toEqual([12, 13, 14]);
  });
});
