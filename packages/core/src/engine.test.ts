import { describe, expect, it } from "vitest";
import { DomdocError } from "./errors.js";
import { FileStore } from "./file-store.js";
import { detectFormat, exportName } from "./formats.js";

const ole = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const ascii = (text: string) => Uint8Array.from(text, (char) => char.charCodeAt(0));
const utf16 = (text: string) => {
  const bytes = new Uint8Array(text.length * 2);
  for (let i = 0; i < text.length; i++) bytes[i * 2] = text.charCodeAt(i);
  return bytes;
};

describe("formats", () => {
  it("detects by magic bytes before extension", () => {
    expect(detectFormat(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), "misnamed.docx")).toBe("pdf");
    expect(detectFormat(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe("docx");
    expect(detectFormat(Uint8Array.from([...[0x50, 0x4b, 0x03, 0x04], ...ascii("xl/workbook.xml")]))).toBe("xlsx");
    expect(detectFormat(Uint8Array.from([...[0x50, 0x4b, 0x03, 0x04], ...ascii("ppt/presentation.xml")]), "notes.docx")).toBe("pptx");
    expect(detectFormat(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))).toBe("doc");
    expect(detectFormat(Uint8Array.from([...ole, ...utf16("Workbook")]), "budget.doc")).toBe("xls");
    expect(detectFormat(new Uint8Array([1, 2]), "notes.pdf")).toBe("pdf");
    expect(detectFormat(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), "photo.svg")).toBe("png");
    expect(detectFormat(new Uint8Array([0xff, 0xd8, 0xff]), "photo.jpg")).toBe("jpeg");
    expect(detectFormat(ascii("<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"), "drawing.svg")).toBe("svg");
    expect(detectFormat(ascii("%PDF-1.4\n%%Creator: Adobe Illustrator\n"), "art.ai")).toBe("ai");
    expect(() => detectFormat(new Uint8Array([1, 2]), "x.txt")).toThrow(DomdocError);
    expect(exportName("Report.final.doc", "docx")).toBe("Report.final.docx");
  });

  it("parses engine error messages", () => {
    const error = DomdocError.from(new Error("read-only: p3 cannot be edited"));
    expect([error.code, error.detail]).toEqual(["read-only", "p3 cannot be edited"]);
  });
});

describe("file store", () => {
  it("adds, replaces, lists and notifies", async () => {
    const files = new FileStore();
    const seen: number[] = [];
    files.onChange((list) => seen.push(list.length));
    const first = await files.add(new Uint8Array([1]), { name: "a.pdf" });
    await files.add(new Uint8Array([2, 3]), { id: first.id, source: "export" });
    expect(files.get(first.id)).toMatchObject({ name: "a.pdf", source: "export", bytes: new Uint8Array([2, 3]) });
    expect(seen).toEqual([1, 1]);
    expect(files.remove(first.id)).toBe(true);
  });
});
