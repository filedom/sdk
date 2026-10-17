import { describe, expect, it } from "vitest";
import { readOpcPackage, writeOpcPackage } from "./opc-package.js";
import {
  appendNumInstanceForAbstractNum,
  applyListRenumberWithOoxmlDefinitions,
  buildNumberingXmlWithListDef,
  buildWordCompatibleNumberingXml,
  buildWordCompatibleSharedAbstractNumberingXml,
  parseNumberingAbstractNumIds,
  parseNumberingNumIds,
} from "./docx-numbering-ooxml-roundtrip.js";
import { DOCX_NUMBERING_PART } from "./docx-numbering-opc-patch.js";

describe("G2-DOCX-07 numbering.xml OOXML round-trip", () => {
  it("builds Word-oriented multi-level defs (G2-DOCX-08 subset)", () => {
    const xml = buildWordCompatibleNumberingXml(9, [
      { ilvl: 0, numFmt: "decimal", lvlText: "%1.", start: 1 },
      { ilvl: 1, numFmt: "lowerLetter", lvlText: "%2.", start: 1, restartAfterIlvl: 0 },
    ]);
    expect(parseNumberingNumIds(xml)).toEqual([9]);
    expect(parseNumberingAbstractNumIds(xml)).toEqual([8]);
    expect(xml).toContain('w:numFmt w:val="lowerLetter"');
    expect(xml).toContain('w:lvlRestart w:val="0"');
  });

  it("G2-DOCX-19 shares one abstractNum across numIds", () => {
    const xml = buildWordCompatibleSharedAbstractNumberingXml(
      3,
      [{ ilvl: 0, numFmt: "decimal", lvlText: "%1.", start: 1 }],
      [12, 13],
    );
    expect(parseNumberingAbstractNumIds(xml)).toEqual([3]);
    expect(parseNumberingNumIds(xml).sort((a, b) => a - b)).toEqual([12, 13]);
    const appended = appendNumInstanceForAbstractNum(xml, 14, 3);
    expect(parseNumberingNumIds(appended).sort((a, b) => a - b)).toEqual([12, 13, 14]);
  });

  it("builds abstractNum and num for a list id", () => {
    const xml = buildNumberingXmlWithListDef(3, "%1.");
    expect(xml).toContain('w:abstractNum w:abstractNumId="2"');
    expect(xml).toContain('w:num w:numId="3"');
    expect(parseNumberingNumIds(xml)).toEqual([3]);
  });

  it("round-trips through OPC read/write with domdoc marker", () => {
    const emptyZip = writeOpcPackage({ members: new Map() });
    const pkg = readOpcPackage(emptyZip);
    const patched = applyListRenumberWithOoxmlDefinitions(pkg, {
      kind: "docx-list-renumber-stub",
      numId: 5,
      markers: ["1. ", "2. "],
    });
    const roundTrip = readOpcPackage(writeOpcPackage(patched));
    const xml = new TextDecoder().decode(roundTrip.members.get(DOCX_NUMBERING_PART)!);
    expect(parseNumberingNumIds(xml)).toContain(5);
    expect(xml).toContain("domdoc:list-renumber");
    expect(xml).toContain('numId="5"');
  });
});
