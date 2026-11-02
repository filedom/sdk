import { describe, expect, it } from "vitest";
import { FiledomError } from "./errors.js";
import { FileStore } from "./file-store.js";
import { detectFormat, exportName, fileKind, unwiredDetail } from "./formats.js";

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
    expect(() => detectFormat(new Uint8Array([1, 2]), "x.txt")).toThrow(FiledomError);
    expect(exportName("Report.final.doc", "docx")).toBe("Report.final.docx");
  });

  it("classifies raster, media, archive, email, and office aliases", () => {
    const bmp = new Uint8Array([0x42, 0x4d, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 40, 0, 0, 0]);
    expect(detectFormat(bmp, "photo.svg")).toBe("bmp");
    expect(detectFormat(new Uint8Array([0x49, 0x49, 42, 0]), "scan.tif")).toBe("tiff");
    expect(detectFormat(ascii("RIFF\0\0\0\0WAVE"), "clip.webp")).toBe("wav");
    expect(detectFormat(ascii("ID3"), "song.bin")).toBe("mp3");
    expect(detectFormat(ascii("\0\0\0\x18ftypM4A "), "voice.mp4")).toBe("m4a");
    expect(detectFormat(ascii("\0\0\0\x18ftypisom"), "film.m4a")).toBe("mp4");
    expect(detectFormat(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, ..."webm".split("").map((c) => c.charCodeAt(0))]), "movie.bin")).toBe("webm");
    expect(detectFormat(new Uint8Array([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]), "pack.zip")).toBe("7z");
    expect(detectFormat(new Uint8Array([0x1f, 0x8b]), "pack.tgz")).toBe("gzip");
    const tar = new Uint8Array(262);
    tar.set(ascii("ustar"), 257);
    expect(detectFormat(tar, "pack.bin")).toBe("tar");
    expect(detectFormat(ascii("Received: from example\r\n"), "mail.txt")).toBe("eml");
    expect(detectFormat(new Uint8Array([1, 2]), "macro.docm")).toBe("docx");
    expect(detectFormat(new Uint8Array([1, 2]), "sheet.xlsm")).toBe("xlsx");
    expect(detectFormat(new Uint8Array([1, 2]), "deck.pptm")).toBe("pptx");
    expect(detectFormat(new Uint8Array([1, 2]), "rows.csv")).toBe("csv");
    expect(detectFormat(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), "photos.zip")).toBe("zip");
    expect(detectFormat(Uint8Array.from([...[0x50, 0x4b, 0x03, 0x04], ...ascii("xl/workbook.xml")]), "photos.zip")).toBe("xlsx");
    const msg = Uint8Array.from([...ole, ...utf16("__nameid_version1.0")]);
    expect(detectFormat(msg, "notes.doc")).toBe("msg");
    expect(fileKind("bmp")).toBe("image");
    expect(fileKind("svg")).toBe("vector");
    expect(fileKind("mp3")).toBe("audio");
    expect(fileKind("mp4")).toBe("video");
    expect(fileKind("zip")).toBe("archive");
    expect(fileKind("eml")).toBe("email");
    expect(fileKind("pdf")).toBe("document");
    expect(unwiredDetail("tiff")).toBeUndefined();
    expect(unwiredDetail("wav")).toBeUndefined();
    expect(unwiredDetail("mp4")).toBeUndefined();
    expect(unwiredDetail("7z")).toBeUndefined();
    expect(unwiredDetail("msg")).toBeUndefined();
    expect(unwiredDetail("csv")).toBeUndefined();
    expect(unwiredDetail("ocr")).toBe("ocr session crate is not wired");
  });

  it("parses engine error messages", () => {
    const error = FiledomError.from(new Error("read-only: p3 cannot be edited"));
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
