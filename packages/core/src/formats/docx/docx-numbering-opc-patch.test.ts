import { describe, expect, it } from "vitest";
import { readOpcPackage, writeOpcPackage } from "./opc-package.js";
import { applyListRenumberToOpcPackage, DOCX_NUMBERING_PART } from "./docx-numbering-opc-patch.js";

describe("G2-DOCX-06 numbering.xml OPC patch", () => {
  it("inserts domdoc list-renumber marker into numbering part", () => {
    const emptyZip = writeOpcPackage({ members: new Map() });
    const pkg = readOpcPackage(emptyZip);
    const patched = applyListRenumberToOpcPackage(pkg, {
      kind: "docx-list-renumber-stub",
      numId: 7,
      markers: ["1. ", "2. "],
    });
    const xml = new TextDecoder().decode(patched.members.get(DOCX_NUMBERING_PART)!);
    expect(xml).toContain('numId="7"');
    expect(xml).toContain("domdoc:list-renumber");
    expect(xml).toContain("1. ");
  });
});
