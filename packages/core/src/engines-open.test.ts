import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { Window } from "happy-dom";
import { describe, expect, it, vi } from "vitest";
import { BundleLoader } from "./bundles.js";
import { createViewerStore } from "./headless.js";
import { replacementOrder } from "./replace-text.js";
import { mediaBundles } from "./engines/media-bundles.js";
import { createEngineLoader } from "./modules.js";
import { openDocument } from "./open.js";
import { storeZip } from "./engines/package-file.js";
import { FiledomViewer } from "./viewer.js";

const fixtures = new URL("../../../../wasm/fixtures/", import.meta.url);
const text = new TextEncoder();

function xml(name: string, body: string) {
  return { name, data: text.encode(body) };
}

function sheet(): Uint8Array {
  return storeZip([
    xml(
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
    ),
    xml(
      "_rels/.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    ),
    xml(
      "xl/workbook.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ),
    xml(
      "xl/_rels/workbook.xml.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    ),
    xml(
      "xl/worksheets/sheet1.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Hello sheet</t></is></c></row></sheetData>
</worksheet>`,
    ),
  ]);
}

function slides(): Uint8Array {
  return storeZip([
    xml(
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`,
    ),
    xml(
      "_rels/.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`,
    ),
    xml(
      "ppt/presentation.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst></p:presentation>`,
    ),
    xml(
      "ppt/_rels/presentation.xml.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`,
    ),
    xml(
      "ppt/slides/slide1.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
<p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Hello slide</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
</p:sld>`,
    ),
  ]);
}

/** One PDF text object per character, so an insert has to move the glyphs after it. */
function perCharacterPdf(text: string, size: number): Uint8Array {
  const widthOf: Record<string, number> = { H: 8.004, e: 6.672, l: 2.664, o: 6.672 };
  let x = 72;
  const ops = ["BT", `/F1 ${size} Tf`];
  for (const ch of text) {
    ops.push(`1 0 0 1 ${x.toFixed(3)} 700 Tm`, `(${ch}) Tj`);
    x += widthOf[ch] ?? size * 0.5;
  }
  ops.push("ET");
  const content = `${ops.join("\n")}\n`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(body);
}

function pdfPlainText(bytes: Uint8Array): string {
  const raw = Buffer.from(bytes);
  let text = raw.toString("latin1");
  let at = 0;
  while (at < raw.length) {
    const startMark = raw.indexOf("stream", at);
    if (startMark < 0) break;
    let start = startMark + "stream".length;
    if (raw[start] === 0x0d && raw[start + 1] === 0x0a) start += 2;
    else if (raw[start] === 0x0a) start += 1;
    const end = raw.indexOf("endstream", start);
    if (end < 0) break;
    try {
      text += inflateSync(raw.subarray(start, end)).toString("latin1");
    } catch {
      /* an uncompressed stream is already in `text` */
    }
    at = end + "endstream".length;
  }
  return text;
}

async function open(bytes: Uint8Array, name: string) {
  const doc = await openDocument({} as never, bytes, { name, core: createEngineLoader() });
  doc.attach("edit");
  return doc;
}

describe("pdfium and office_oxide", () => {
  it("opens a PDF, keeps the raster, and round-trips a revision in the file", async () => {
    const bytes = new Uint8Array(readFileSync(new URL("sample.pdf", fixtures)));
    const doc = await open(bytes, "sample.pdf");
    expect(doc.format).toBe("pdf");
    expect(doc.info().pageCount).toBeGreaterThan(0);
    const page = doc.page(0);
    expect(page.rasterized).toBe(true);
    const raster = doc.raster(0, 1);
    expect(raster && raster.rgba.length).toBe(raster!.width * raster!.height * 4);
    const line = page.runs.map((run) => run.text).join("");
    expect(line.length).toBeGreaterThan(0);
    const title = page.runs.find((run) => run.text.includes("Hello"));
    const placed = page.runs.find((run) => run.text.includes("Line two"));
    expect(title?.fontSizePt).toBeCloseTo(14, 0);
    expect(placed?.fontSizePt).toBeCloseTo(12, 0);
    expect(placed?.xPt).toBeCloseTo(72, 0);
    expect(placed && title && placed.yPt).toBeGreaterThan(title?.yPt ?? 0);
    const widths = placed?.advances ?? [];
    expect(widths.length).toBe(Array.from(placed?.text ?? "").length);
    expect(Math.max(...widths) - Math.min(...widths)).toBeGreaterThan(1);

    doc.apply({ type: "setTrackChanges", enabled: true, author: "Demo user" });
    const unit = page.runs.find((run) => run.text.includes("Line two")) ?? page.runs[0]!;
    const whole = doc.unitText(unit.unit);
    doc.handle({ type: "select", anchor: { unit: unit.unit, offset: 0 }, focus: { unit: unit.unit, offset: Array.from(whole).length } });
    doc.handle({ type: "text", text: "Line two was edited" });
    expect(doc.revisions()[0]).toMatchObject({ deleted: whole, inserted: "Line two was edited" });
    const edited = doc.page(0).runs.find((run) => run.text.includes("Line two was edited"));
    expect(edited).toBeTruthy();
    // PDF commits the typed line into the file and re-reads glyphs, so the viewer
    // paints from the updated raster instead of a `redraw` overlay.
    expect(edited?.redraw ?? false).toBe(false);
    expect(edited?.yPt).toBeCloseTo(placed?.yPt ?? 0, 0);

    const saved = doc.export().bytes;
    expect(new TextDecoder().decode(saved.subarray(0, 4))).toBe("%PDF");
    doc.dispose();

    const again = await open(saved, "sample-edited.pdf");
    expect(again.revisions()[0]?.inserted).toBe("Line two was edited");
    const id = again.revisions()[0]!.id;
    again.apply({ type: "reject", id });
    expect(again.revisions()).toEqual([]);
    expect(again.unitText(unit.unit)).toBe(whole);
    again.dispose();
  }, 60_000);

  it("deletes a PDF image and a text line, and undo brings the image back", async () => {
    const bytes = new Uint8Array(readFileSync(new URL("shapes.pdf", fixtures)));
    const doc = await open(bytes, "shapes.pdf");
    const page = doc.page(0);
    const image = page.objects?.find((object) => object.kind === "image");
    const line = page.runs.find((run) => run.text.includes("Line two"));
    expect(image?.id).toBeTruthy();
    expect(line?.unit).toBeTruthy();
    doc.apply({ type: "deleteObject", id: image!.id });
    expect(doc.page(0).objects?.some((object) => object.kind === "image")).toBe(false);
    expect(doc.page(0).objects?.some((object) => object.kind === "path")).toBe(true);
    doc.apply({ type: "deleteObject", id: line!.unit });
    expect(doc.page(0).runs.some((run) => run.text.includes("Line two"))).toBe(false);
    const saved = doc.export().bytes;
    doc.apply({ type: "undo" });
    expect(doc.page(0).runs.some((run) => run.text.includes("Line two"))).toBe(true);
    doc.apply({ type: "undo" });
    expect(doc.page(0).objects?.some((object) => object.kind === "image")).toBe(true);
    doc.dispose();
    const again = await open(saved, "shapes-deleted.pdf");
    expect(again.page(0).objects?.some((object) => object.kind === "image")).toBe(false);
    expect(again.page(0).runs.some((run) => run.text.includes("Line two"))).toBe(false);
    expect(again.page(0).objects?.some((object) => object.kind === "path")).toBe(true);
    again.dispose();
  }, 60_000);

  it("moves a PDF image and reopens it at the new position", async () => {
    const bytes = new Uint8Array(readFileSync(new URL("shapes.pdf", fixtures)));
    const doc = await open(bytes, "shapes.pdf");
    const page = doc.page(0);
    const image = page.objects?.find((object) => object.kind === "image");
    const shape = page.objects?.find((object) => object.kind === "path");
    expect(image?.widthPt).toBeGreaterThan(20);
    expect(shape?.widthPt).toBeGreaterThan(20);
    doc.apply({
      type: "transformObject",
      id: image!.id,
      dxPt: 36,
      dyPt: 0,
      scaleX: 1,
      scaleY: 1,
      rotateDeg: 0,
    });
    const moved = doc.page(0).objects?.find((object) => object.id === image!.id);
    expect(moved?.xPt).toBeGreaterThan(image!.xPt + 20);
    const saved = doc.export().bytes;
    doc.dispose();
    const again = await open(saved, "shapes-moved.pdf");
    const reopened = again.page(0).objects?.find((object) => object.kind === "image");
    expect(reopened?.xPt).toBeGreaterThan(image!.xPt + 20);
    again.dispose();
  }, 60_000);

  /**
   * AC: viewer-clockwise rotateDeg matches reported rotation direction and keeps
   * the object center (no opposite spin / jump on commit).
   */
  it("rotates a PDF image clockwise and keeps its center", async () => {
    const bytes = new Uint8Array(readFileSync(new URL("shapes.pdf", fixtures)));
    const doc = await open(bytes, "shapes.pdf");
    const image = doc.page(0).objects?.find((object) => object.kind === "image");
    expect(image).toBeTruthy();
    const before = image!;
    const cx = before.xPt + before.widthPt / 2;
    const cy = before.yPt + before.heightPt / 2;
    doc.apply({
      type: "transformObject",
      id: before.id,
      dxPt: 0,
      dyPt: 0,
      scaleX: 1,
      scaleY: 1,
      rotateDeg: 25,
    });
    const after = doc.page(0).objects?.find((object) => object.id === before.id);
    expect(after).toBeTruthy();
    const delta = ((after!.rotation - before.rotation) % 360 + 540) % 360 - 180;
    expect(delta).toBeGreaterThan(15);
    expect(delta).toBeLessThan(35);
    const ncx = after!.xPt + after!.widthPt / 2;
    const ncy = after!.yPt + after!.heightPt / 2;
    expect(Math.abs(ncx - cx)).toBeLessThan(8);
    expect(Math.abs(ncy - cy)).toBeLessThan(8);
    doc.dispose();
  }, 60_000);

  it("moves a PDF text line and reopens it at the new position", async () => {
    const bytes = new Uint8Array(readFileSync(new URL("sample.pdf", fixtures)));
    const doc = await open(bytes, "sample.pdf");
    const page = doc.page(0);
    const line = page.runs.find((run) => run.text.includes("Line two"))!;
    const moved = line.xPt + 36;
    doc.apply({ type: "moveUnit", unit: line.unit, xPt: moved, yPt: line.yPt });
    const after = doc.page(0).runs.find((run) => run.unit === line.unit);
    expect(after?.xPt).toBeGreaterThan(line.xPt + 20);
    const saved = doc.export().bytes;
    doc.dispose();
    const again = await open(saved, "sample-moved.pdf");
    const reopened = again.page(0).runs.find((run) => run.text.includes("Line two"));
    expect(reopened?.xPt).toBeGreaterThan(line.xPt + 20);
    again.dispose();
  }, 60_000);

  /**
   * AC: char→page-object mapping stays correct after the O(chars+objects) index
   * rewrite (heavy PDFs used to spend seconds in chars_for_object × object count).
   * Moving a line proves anchors still point at real page objects.
   */
  it("keeps PDF text-object anchors so a moved line survives export", async () => {
    const bytes = new Uint8Array(readFileSync(new URL("sample.pdf", fixtures)));
    const t0 = performance.now();
    const doc = await open(bytes, "sample.pdf");
    const openMs = performance.now() - t0;
    expect(openMs).toBeLessThan(5_000);
    const page = doc.page(0);
    expect(page.objects?.some((object) => object.kind === "text")).toBe(true);
    const line = page.runs.find((run) => run.text.includes("Hello"))!;
    doc.apply({ type: "moveUnit", unit: line.unit, xPt: line.xPt + 48, yPt: line.yPt });
    const after = doc.page(0).runs.find((run) => run.unit === line.unit);
    expect(after?.xPt).toBeGreaterThan(line.xPt + 20);
    const saved = doc.export().bytes;
    doc.dispose();
    const again = await open(saved, "sample-anchored.pdf");
    const reopened = again.page(0).runs.find((run) => run.text.includes("Hello"));
    expect(reopened?.xPt).toBeGreaterThan(line.xPt + 20);
    again.dispose();
  }, 60_000);

  it("opens doc and docx and writes Word revision marks", async () => {
    for (const name of ["report.docx", "report.doc"]) {
      const bytes = new Uint8Array(readFileSync(new URL(name, fixtures)));
      const doc = await open(bytes, name);
      expect(doc.info().pageCount).toBeGreaterThan(0);
      const page = doc.page(0);
      const joined = page.runs.map((run) => run.text).join(" ");
      expect(joined).toMatch(/Quarterly/);
      doc.apply({ type: "setTrackChanges", enabled: true, author: "Demo user" });
      const run = page.runs.find((item) => item.text.includes("Quarterly"))!;
      const start = run.unitStart + run.text.indexOf("Quarterly");
      doc.handle({
        type: "select",
        anchor: { unit: run.unit, offset: start },
        focus: { unit: run.unit, offset: start + "Quarterly".length },
      });
      doc.handle({ type: "text", text: "Annual" });
      expect(doc.search("Annual Report").length).toBeGreaterThan(0);
      const saved = doc.export().bytes;
      expect(String.fromCharCode(saved[0]!, saved[1]!)).toBe("PK");
      if (name.endsWith(".docx")) {
        const xml = new TextDecoder().decode(saved);
        expect(xml).toContain("w:del");
        expect(xml).toContain("w:ins");
      }
      doc.dispose();
    }
  }, 30_000);

  /**
   * AC: typing into a line of separate PDF text objects keeps the face and
   * moves the following glyph past the new character.
   */
  it("inserts into a PDF line without covering the next character or changing its face", async () => {
    const bytes = perCharacterPdf("Hello", 12);
    const doc = await open(bytes, "per-char.pdf");
    const line = doc.page(0).runs.find((run) => run.text.includes("Hello"))!;
    expect(line.fontSizePt).toBeCloseTo(12, 0);
    expect(line.font).toMatch(/Helvetica/);
    expect(line.color?.toLowerCase()).toBe("#000000");
    doc.handle({
      type: "select",
      anchor: { unit: line.unit, offset: 4 },
      focus: { unit: line.unit, offset: 4 },
    });
    doc.handle({ type: "text", text: "W" });
    const edited = doc.page(0).runs.find((run) => run.text.includes("HellW"))!;
    expect(edited.font).toMatch(/Helvetica/);
    expect(edited.fontSizePt).toBeCloseTo(12, 0);
    const saved = pdfPlainText(doc.export().bytes);
    const origins = [...saved.matchAll(/1 0 0 1 ([\d.]+) [\d.]+ cm/g)].map((match) => Number(match[1]));
    expect(origins.length).toBeGreaterThanOrEqual(5);
    const last = origins[origins.length - 1]!;
    const beforeLast = origins[origins.length - 2]!;
    expect(last - beforeLast).toBeGreaterThan(8);
    doc.dispose();
  }, 60_000);

  it("lists a PDF layer, formats text, and stores a filedom snapshot", async () => {
    const bytes = new Uint8Array(readFileSync(new URL("sample.pdf", fixtures)));
    const doc = await open(bytes, "sample.pdf");
    const info = doc.info();
    expect(info.capabilities.transform).toBe(true);
    expect(info.capabilities.formatText).toBe(true);
    expect(info.layers?.length).toBeGreaterThan(0);
    const page = doc.page(0);
    expect(page.objects?.some((object) => object.layerId === "layer0")).toBe(true);
    const run = page.runs.find((item) => item.text.trim().length > 0);
    expect(run).toBeTruthy();
    const end = run!.unitStart + Array.from(run!.text).length;
    doc.apply({
      type: "format",
      ranges: [{ unit: run!.unit, start: run!.unitStart, end }],
      style: { bold: true },
    });
    expect(doc.page(0).runs.some((item) => item.unit === run!.unit && item.bold)).toBe(true);
    doc.apply({
      type: "format",
      ranges: [{ unit: run!.unit, start: run!.unitStart, end: run!.unitStart + 1 }],
      style: { underline: true },
    });
    const underlined = doc.page(0).runs.filter((item) => item.unit === run!.unit && item.underline);
    expect(underlined.map((item) => item.text).join("")).toBe(Array.from(run!.text)[0]);
    const image = page.objects?.find((object) => object.kind === "image");
    if (image) {
      doc.apply({
        type: "transformObject",
        id: image.id,
        dxPt: 12,
        dyPt: 0,
        scaleX: 1,
        scaleY: 1,
        rotateDeg: 0,
      });
    }
    doc.apply({ type: "storeFiledom" });
    expect(doc.info().exportExtension).toBe("filedom");
    const saved = doc.export().bytes;
    expect(new TextDecoder().decode(saved.slice(0, 6))).toBe("FILEDOM");
    doc.dispose();
  }, 60_000);

  it("bolds one PDF character", async () => {
    const bytes = perCharacterPdf("Hello", 12);
    const doc = await open(bytes, "hello.pdf");
    const line = doc.page(0).runs.find((run) => run.text.includes("Hello"))!;
    doc.apply({
      type: "format",
      ranges: [{ unit: line.unit, start: line.unitStart, end: line.unitStart + 1 }],
      style: { bold: true },
    });
    const after = doc.page(0).runs.filter((run) => run.unit === line.unit);
    expect(after.some((run) => run.bold)).toBe(true);
    doc.dispose();
  }, 60_000);

  it("changes only the highlighted PDF characters and moves the glyphs after them", async () => {
    const bytes = perCharacterPdf("Hello", 12);
    const doc = await open(bytes, "hello.pdf");
    const line = doc.page(0).runs.find((run) => run.text.includes("Hello"))!;
    const before = doc.page(0).runs.filter((run) => run.unit === line.unit);
    const tail = before.find((run) => run.unitStart >= line.unitStart + 4) ?? before[before.length - 1]!;
    const tailBefore = tail.xPt;
    doc.apply({
      type: "format",
      ranges: [{ unit: line.unit, start: line.unitStart + 1, end: line.unitStart + 4 }],
      style: { sizePt: 24, color: "#c00000" },
    });
    const after = doc
      .page(0)
      .runs.filter((run) => run.unit === line.unit)
      .sort((left, right) => left.unitStart - right.unitStart);
    expect(after.map((run) => run.text).join("")).toContain("Hello");
    const highlighted = after.filter((run) => run.unitStart < line.unitStart + 4 && run.unitStart + Array.from(run.text).length > line.unitStart + 1);
    expect(highlighted.length).toBeGreaterThan(0);
    for (const run of highlighted) {
      expect(run.fontSizePt).toBeCloseTo(24, 0);
      expect(run.color).toBe("#c00000");
    }
    const plain = after.filter((run) => run.unitStart + Array.from(run.text).length <= line.unitStart + 1 || run.unitStart >= line.unitStart + 4);
    for (const run of plain) {
      expect(run.fontSizePt).toBeCloseTo(12, 0);
      expect(run.color ?? "#000000").toBe("#000000");
    }
    const tailAfter = after.find((run) => run.unitStart >= line.unitStart + 4)!;
    expect(tailAfter.xPt).toBeGreaterThan(tailBefore + 4);
    for (let index = 1; index < after.length; index += 1) {
      const previous = after[index - 1]!;
      expect(after[index]!.xPt).toBeGreaterThan(previous.xPt + previous.widthPt - 1);
    }
    doc.dispose();
  }, 60_000);

  it("formats only the highlighted span of one PDF text object", async () => {
    const bytes = new Uint8Array(readFileSync(new URL("sample.pdf", fixtures)));
    const doc = await open(bytes, "sample.pdf");
    const line = doc.page(0).runs.find((run) => run.text.includes("Hello"))!;
    const hello = line.unitStart + line.text.indexOf("Hello");
    doc.apply({
      type: "format",
      ranges: [{ unit: line.unit, start: hello, end: hello + "Hello".length }],
      style: { sizePt: 22, color: "#c00000" },
    });
    const after = doc
      .page(0)
      .runs.filter((run) => run.unit === line.unit)
      .sort((left, right) => left.unitStart - right.unitStart);
    expect(after.map((run) => run.text).join("")).toContain("Hello filedom PDF");
    const highlighted = after.filter(
      (run) => run.unitStart < hello + 5 && run.unitStart + Array.from(run.text).length > hello,
    );
    expect(highlighted.map((run) => run.text).join("")).toBe("Hello");
    for (const run of highlighted) {
      expect(run.fontSizePt).toBeCloseTo(22, 0);
      expect(run.color).toBe("#c00000");
    }
    const rest = after.filter((run) => run.unitStart >= hello + 5);
    expect(rest.map((run) => run.text).join("")).toContain("filedom PDF");
    for (const run of rest) {
      expect(run.fontSizePt).toBeCloseTo(14, 0);
      expect(run.color ?? "#000000").not.toBe("#c00000");
    }
    for (let index = 1; index < after.length; index += 1) {
      const previous = after[index - 1]!;
      expect(after[index]!.xPt).toBeGreaterThan(previous.xPt + previous.widthPt - 1);
    }
    doc.dispose();
  }, 60_000);

  it("italicizes a PDF line after size and bold edits on the page", async () => {
    const bytes = new Uint8Array(readFileSync(new URL("sample.pdf", fixtures)));
    const doc = await open(bytes, "sample.pdf");
    const first = doc.page(0).runs.find((run) => run.text.includes("Hello"))!;
    const second = doc.page(0).runs.find((run) => run.text.includes("Line two"))!;
    const whole = (run: typeof first) => ({
      unit: run.unit,
      start: run.unitStart,
      end: run.unitStart + Array.from(run.text).length,
    });
    doc.apply({ type: "format", ranges: [whole(first)], style: { sizePt: 18 } });
    doc.apply({
      type: "format",
      ranges: [{ unit: second.unit, start: second.unitStart + 6, end: second.unitStart + 8 }],
      style: { sizePt: 18 },
    });
    doc.apply({
      type: "format",
      ranges: [{ unit: second.unit, start: second.unitStart + 12, end: second.unitStart + 14 }],
      style: { bold: true },
    });
    doc.apply({ type: "format", ranges: [whole(second)], style: { sizePt: 9 } });
    doc.apply({ type: "format", ranges: [whole(first)], style: { italic: true } });
    const hello = doc.page(0).runs.filter((run) => run.unit === first.unit);
    expect(hello.map((run) => run.text).join("")).toBe("Hello filedom PDF");
    expect(hello.every((run) => run.italic)).toBe(true);
    for (const run of hello) expect(run.fontSizePt).toBeCloseTo(18, 0);
    const lineTwo = doc.page(0).runs.filter((run) => run.unit === second.unit);
    expect(lineTwo.map((run) => run.text).join("")).toBe("Line two for edit test");
    for (const run of lineTwo) expect(run.fontSizePt).toBeCloseTo(9, 0);
    const bold = lineTwo.filter(
      (run) => run.unitStart < second.unitStart + 14 && run.unitStart + Array.from(run.text).length > second.unitStart + 12,
    );
    expect(bold.length).toBeGreaterThan(0);
    expect(bold.every((run) => run.bold)).toBe(true);
    doc.dispose();
  }, 60_000);

  it("underlines and strikes only the highlighted PDF characters", async () => {
    const bytes = new Uint8Array(readFileSync(new URL("sample.pdf", fixtures)));
    const doc = await open(bytes, "sample.pdf");
    const line = doc.page(0).runs.find((run) => run.text.includes("Hello"))!;
    const whole = {
      unit: line.unit,
      start: line.unitStart,
      end: line.unitStart + Array.from(line.text).length,
    };
    const dom = { unit: line.unit, start: line.unitStart + 6, end: line.unitStart + 9 };
    doc.apply({ type: "format", ranges: [whole], style: { italic: true } });
    doc.apply({ type: "format", ranges: [dom], style: { italic: false } });
    doc.apply({ type: "format", ranges: [dom], style: { underline: true } });
    let runs = doc.page(0).runs.filter((run) => run.unit === line.unit);
    expect(runs.map((run) => run.text).join("")).toBe("Hello filedom PDF");
    expect(runs.find((run) => run.text === "dom")).toMatchObject({ underline: true, italic: false });
    expect(runs.filter((run) => run.text !== "dom").every((run) => run.italic && !run.underline)).toBe(true);
    doc.apply({ type: "format", ranges: [dom], style: { strike: true } });
    runs = doc.page(0).runs.filter((run) => run.unit === line.unit);
    expect(runs.find((run) => run.text === "dom")).toMatchObject({ underline: true, strike: true });
    expect(runs.filter((run) => run.text !== "dom").every((run) => !run.strike)).toBe(true);
    doc.apply({ type: "format", ranges: [whole], style: { sizePt: 18 } });
    runs = doc.page(0).runs.filter((run) => run.unit === line.unit);
    expect(runs.find((run) => run.text === "dom")).toMatchObject({ underline: true, strike: true });
    for (const run of runs) expect(run.fontSizePt).toBeCloseTo(18, 0);
    const saved = pdfPlainText(doc.export().bytes);
    expect(saved.match(/[\d.]+ [\d.]+ l\nS/g)?.length).toBe(2);
    const second = doc.page(0).runs.find((run) => run.unit !== line.unit && run.text.includes("Line two"));
    expect(second?.underline).toBe(false);
    expect(second?.strike).toBe(false);
    doc.dispose();
  }, 60_000);

  it("opens a DOCX, tracks an insert, and exposes history", async () => {
    const bytes = new Uint8Array(readFileSync(new URL("report.docx", fixtures)));
    const doc = await open(bytes, "report.docx");
    doc.apply({ type: "setTrackChanges", enabled: true, author: "Demo" });
    const page = doc.page(0);
    const run = page.runs.find((item) => item.text.includes("Quarterly"))!;
    const start = run.unitStart + run.text.indexOf("Quarterly");
    doc.handle({
      type: "select",
      anchor: { unit: run.unit, offset: start },
      focus: { unit: run.unit, offset: start },
    });
    doc.handle({ type: "text", text: "X" });
    const after = doc.page(0);
    expect(after.runs.some((item) => item.revision?.kind === "insert" || item.text.includes("X"))).toBe(true);
    expect(doc.info().history?.length).toBeGreaterThan(0);
    doc.apply({ type: "setLayer", id: "layer0", visible: false });
    expect(doc.info().layers?.[0]?.visible).toBe(false);
    doc.dispose();
  }, 30_000);

  it("replaces every match in pdf, word, excel, and powerpoint text", async () => {
    const cases: Array<[string, Uint8Array, string, string]> = [
      ["sample.pdf", new Uint8Array(readFileSync(new URL("sample.pdf", fixtures))), "Line two", "Second line"],
      ["report.docx", new Uint8Array(readFileSync(new URL("report.docx", fixtures))), "Quarterly", "Yearly"],
      ["book.xlsx", sheet(), "Hello sheet", "Hi sheet"],
      ["deck.pptx", slides(), "Hello slide", "Hi slide"],
    ];
    for (const [name, bytes, query, next] of cases) {
      const doc = await open(bytes, name);
      const hits = replacementOrder(doc.search(query));
      expect(hits.length, name).toBeGreaterThan(0);
      for (const hit of hits) {
        doc.apply({
          type: "replace",
          from: { unit: hit.unit, offset: hit.start },
          to: { unit: hit.unit, offset: hit.end },
          text: next,
        });
      }
      expect(doc.search(query), name).toHaveLength(0);
      expect(doc.search(next).length, name).toBeGreaterThanOrEqual(hits.length);
      doc.dispose();
    }
  }, 60_000);

  it("opens xlsx, xls, pptx and ppt through office_oxide", async () => {
    const workbook = await open(sheet(), "book.xlsx");
    expect(workbook.format).toBe("xlsx");
    expect(workbook.page(0).runs.map((run) => run.text).join("")).toContain("Hello sheet");
    workbook.dispose();

    const deck = await open(slides(), "deck.pptx");
    expect(deck.format).toBe("pptx");
    expect(deck.page(0).runs.map((run) => run.text).join("")).toContain("Hello slide");
    deck.dispose();

    const xls = await open(new Uint8Array(readFileSync(new URL("simple.xls", fixtures))), "simple.xls");
    expect(xls.format).toBe("xls");
    expect(xls.page(0).runs.some((run) => run.text.trim().length > 0)).toBe(true);
    xls.dispose();

    const ppt = await open(new Uint8Array(readFileSync(new URL("simple.ppt", fixtures))), "simple.ppt");
    expect(ppt.format).toBe("ppt");
    expect(ppt.page(0).runs.some((run) => run.text.trim().length > 0)).toBe(true);
    ppt.dispose();
  }, 30_000);
});

describe("headless store on a real engine", () => {
  it("zooms a PDF through the store and reports an action PDF cannot do as unsupported", async () => {
    // The rest of this file runs under node; only the viewer needs a DOM.
    const window = new Window();
    const scope = window as unknown as Record<string, unknown>;
    vi.stubGlobal("window", window);
    for (const key of Object.getOwnPropertyNames(window)) {
      if (key in globalThis) continue;
      const value = scope[key];
      vi.stubGlobal(key, typeof value === "function" && /^[a-z]/.test(key) ? value.bind(window) : value);
    }
    try {
      const root = window.document.createElement("div");
      window.document.body.append(root);
      const viewer = new FiledomViewer(root as unknown as HTMLElement, {
        bundles: {},
        core: createEngineLoader(),
        toolbar: false,
      });
      const store = createViewerStore(viewer);
      const statuses: string[] = [];
      store.subscribe(() => statuses.push(store.getSnapshot().status));

      await viewer.open(new Uint8Array(readFileSync(new URL("sample.pdf", fixtures))), { name: "sample.pdf" });
      expect(statuses[0]).toBe("loading");
      const opened = store.getSnapshot();
      expect(opened.status).toBe("ready");
      expect(opened.document).toMatchObject({ name: "sample.pdf", format: "pdf" });
      expect(opened.document!.pageCount).toBeGreaterThan(0);
      expect(opened.document!.capabilities).toEqual(viewer.document!.info().capabilities);

      const before = viewer.getZoom();
      expect(store.run("zoomIn")).toEqual({ status: "applied" });
      expect(viewer.getZoom()).toBeGreaterThan(before);
      expect(store.getSnapshot().zoom).toBe(viewer.getZoom());

      const hits = store.viewer.search("Line two");
      expect(store.getSnapshot().search).toEqual({ query: "Line two", hitCount: hits.length, hitIndex: hits.length ? 0 : -1 });

      const line = viewer.document!.page(0).runs.find((run) => run.text.includes("Line two"))!;
      await viewer.selectAsync({ unit: line.unit, offset: 0 }, { unit: line.unit, offset: 4 });
      expect(store.getSnapshot().selection?.text).toBe("Line");
      expect(viewer.document!.info().capabilities.formatParagraph).toBe(false);
      const errors: unknown[] = [];
      viewer.on("error", (event) => errors.push(event));
      const result = store.run("alignCenter");
      expect(result).toEqual({ status: "unsupported", detail: "Align center is not supported for PDF documents" });
      expect(errors).toEqual([]);

      store.viewer.search("Line two");
      const replaced = await store.viewer.replaceAll("Second line");
      expect(replaced).toBe(hits.length);
      expect(store.viewer.search("Line two")).toHaveLength(0);
      expect(store.viewer.document!.search("Second line").length).toBeGreaterThan(0);

      store.destroy();
      viewer.destroy();
    } finally {
      vi.unstubAllGlobals();
      await window.happyDOM.close();
    }
  }, 60_000);
});

describe("timeline commands", () => {
  it("trims a WAV shorter and refuses the same command on a PDF", async () => {
    const wav = tinyWav();
    const loader = new BundleLoader(mediaBundles());
    const audio = await openDocument(loader, wav, { name: "tone.wav", core: createEngineLoader() });
    audio.attach("edit");
    expect(audio.info().capabilities.timeline).toBe(true);
    audio.apply({ type: "trimClip", id: "c0", startMs: 0, endMs: 500 });
    expect(audio.exportBytes().byteLength).toBeLessThan(wav.byteLength);

    const pdf = await open(new Uint8Array(readFileSync(new URL("sample.pdf", fixtures))), "sample.pdf");
    expect(() => pdf.apply({ type: "trimClip", id: "c0", startMs: 0, endMs: 500 })).toThrow(
      "unsupported: timeline editing is not supported",
    );
  }, 60_000);
});

/** 8-bit mono PCM, 8000 Hz, one second of silence. */
function tinyWav(): Uint8Array {
  const samples = 8000;
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0);
  bytes.set([0x57, 0x41, 0x56, 0x45], 8);
  bytes.set([0x66, 0x6d, 0x74, 0x20], 12);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  bytes.set([0x64, 0x61, 0x74, 0x61], 36);
  view.setUint32(40, samples, true);
  view.setUint32(4, bytes.byteLength - 8, true);
  return bytes;
}
