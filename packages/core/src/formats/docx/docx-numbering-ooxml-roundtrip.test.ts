import { describe, expect, it } from "vitest";
import { readOpcPackage, writeOpcPackage } from "./opc-package.js";
import {
  applyListRenumberWithOoxmlDefinitions,
  buildNumberingXmlWithListDef,
  parseNumberingNumIds,
} from "./docx-numbering-ooxml-roundtrip.js";
import { DOCX_NUMBERING_PART } from "./docx-numbering-opc-patch.js";

describe("G2-DOCX-07 numbering.xml OOXML round-trip", () => {
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
