import { describe, expect, it } from "vitest";
import { readOpcPackage, writeOpcPackage } from "./opc-package.js";
import { writeNumberingOpcFromSessionListState } from "./docx-numbering-session-writeback.js";
import { DOCX_NUMBERING_PART } from "./docx-numbering-opc-patch.js";
import { parseNumberingNumIds } from "./docx-numbering-ooxml-roundtrip.js";
import type { ListParagraphMeta } from "./docx-list-numbering-stub.js";

describe("G2-DOCX-11 session numbering OPC write-back", () => {
  const paragraphs: ListParagraphMeta[] = [
    { text: "Alpha", numId: 2, ilvl: 0 },
    { text: "Beta", numId: 2, ilvl: 0 },
    { text: "Nested", numId: 2, ilvl: 1 },
  ];

  it("writes numbering.xml from session list markers", () => {
    const pkg = readOpcPackage(writeOpcPackage({ members: new Map() }));
    const patched = writeNumberingOpcFromSessionListState(pkg, paragraphs);
    const xml = new TextDecoder().decode(patched.members.get(DOCX_NUMBERING_PART)!);
    expect(parseNumberingNumIds(xml)).toContain(2);
    expect(xml).toContain("domdoc:list-renumber");
  });
});
