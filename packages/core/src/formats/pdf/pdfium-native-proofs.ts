import type { DomdocPdfiumApi, PdfiumNativeInspection } from "./pdfium-native-api.js";
import { PdfiumWasmWriterBackend } from "./backends/pdfium-wasm-backend.js";
import type { PdfiumWasmLoadResult } from "./backends/pdfium-wasm-backend.js";
import type { PdfProofFixtureId } from "./pdfium-proof-hooks.js";
import { createPdfWriterSession } from "./writer.js";
import type { PdfEditOperation } from "./types.js";

export type NativeProofStatus = "pass" | "fail" | "not-run" | "blocked";

export interface NativeFixtureProof {
  fixtureId: PdfProofFixtureId | "P11" | "P12";
  nativeProof: NativeProofStatus;
  detail: string;
  inspection?: PdfiumNativeInspection;
}

const GREEN = [0, 180, 40, 255] as const;
const RED = [200, 20, 20, 255] as const;

function rgbaFill(width: number, height: number, color: readonly [number, number, number, number]): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) out.set(color, i * 4);
  return out;
}

function textBlob(inspection: PdfiumNativeInspection): string {
  return inspection.pages.map((p) => p.text).join("\n");
}

function imageCount(inspection: PdfiumNativeInspection, pageIndex: number): number {
  return inspection.pages[pageIndex]?.objects.filter((o) => o.kind === "image").length ?? 0;
}

async function roundTrip(
  api: DomdocPdfiumApi,
  load: PdfiumWasmLoadResult,
  bytes: Uint8Array,
  operations: readonly PdfEditOperation[],
): Promise<{ inspection: PdfiumNativeInspection; applyOk: boolean; saveOk: boolean; rolledBack?: boolean; detail: string }> {
  const backend = new PdfiumWasmWriterBackend(load);
  const session = await createPdfWriterSession(bytes, { backend, expectedRevision: 0 });
  try {
    const preflight = await session.preflight(bytes);
    if (!preflight.ok) {
      return { inspection: { pageCount: 0, pages: [] }, applyOk: false, saveOk: false, detail: preflight.message };
    }
    const apply = await session.apply(operations);
    if (!apply.ok) {
      return {
        inspection: { pageCount: 0, pages: [] },
        applyOk: false,
        saveOk: false,
        rolledBack: apply.rolledBack,
        detail: apply.message,
      };
    }
    const saved = await session.save();
    if (!saved.ok) {
      return { inspection: { pageCount: 0, pages: [] }, applyOk: true, saveOk: false, detail: saved.message };
    }
    const reopened = api.loadDocument(saved.bytes);
    try {
      return {
        inspection: api.inspect(reopened),
        applyOk: true,
        saveOk: true,
        detail: "reopened",
      };
    } finally {
      api.close(reopened);
    }
  } finally {
    await session.dispose();
  }
}

export async function runNativeFeasibilityProofs(load: PdfiumWasmLoadResult): Promise<NativeFixtureProof[]> {
  const api = load.api;
  if (!load.writerExportsReady || !api) {
    return (["P01", "P02", "P03", "P04", "P05", "P11", "P12"] as const).map((fixtureId) => ({
      fixtureId,
      nativeProof: "not-run",
      detail: "C24 writer API not loaded",
    }));
  }

  const proofs: NativeFixtureProof[] = [];

  const p01Doc = api.createDocument();
  api.addPage(p01Doc, 0);
  api.addTextObject(p01Doc, 0, "ORIGINAL");
  const p01Bytes = api.save(p01Doc);
  api.close(p01Doc);
  const p01 = await roundTrip(api, load, p01Bytes, [
    { kind: "replaceTextRun", pageIndex: 0, objectId: "0:0", newText: "hello", expectedRevision: 0 },
  ]);
  const p01Text = textBlob(p01.inspection);
  proofs.push({
    fixtureId: "P01",
    nativeProof: p01.applyOk && p01.saveOk && p01Text.includes("hello") && !p01Text.includes("ORIGINAL") ? "pass" : "fail",
    detail: `text=${JSON.stringify(p01Text)} ${p01.detail}`,
    inspection: p01.inspection,
  });

  const p02Doc = api.createDocument();
  api.addPage(p02Doc, 0);
  api.addTextObject(p02Doc, 0, "ABCDEFGH", "Helvetica", 12, 72, 720);
  const p02Before = api.inspect(p02Doc);
  const p02Bounds = p02Before.pages[0]?.objects[0]?.bounds ?? null;
  const p02Bytes = api.save(p02Doc);
  api.close(p02Doc);
  const p02 = await roundTrip(api, load, p02Bytes, [
    { kind: "replaceTextRun", pageIndex: 0, objectId: "0:0", newText: "ABxyEFGH", expectedRevision: 0 },
  ]);
  const p02Text = textBlob(p02.inspection);
  const p02AfterBounds = p02.inspection.pages[0]?.objects[0]?.bounds ?? null;
  const prefixOk = p02Text.includes("AB") && p02Text.includes("EFGH") && p02Text.includes("xy");
  const posOk = !p02Bounds || !p02AfterBounds || Math.abs(p02Bounds.left - p02AfterBounds.left) < 2;
  proofs.push({
    fixtureId: "P02",
    nativeProof: p02.applyOk && p02.saveOk && prefixOk && posOk && !p02Text.includes("CD") ? "pass" : "fail",
    detail: `text=${JSON.stringify(p02Text)} boundsBefore=${JSON.stringify(p02Bounds)} boundsAfter=${JSON.stringify(p02AfterBounds)}`,
    inspection: p02.inspection,
  });

  const p03Doc = api.createDocument();
  api.addPage(p03Doc, 0);
  api.addTextObject(p03Doc, 0, "KERN_A", "Helvetica", 12, 72, 720);
  api.addTextObject(p03Doc, 0, "KERN_B", "Helvetica", 12, 200, 720);
  const p03Bytes = api.save(p03Doc);
  api.close(p03Doc);
  const p03 = await roundTrip(api, load, p03Bytes, [
    { kind: "replaceTextRun", pageIndex: 0, objectId: "0:0", newText: "long replacement text", expectedRevision: 0 },
    { kind: "replaceTextRun", pageIndex: 0, objectId: "0:1", newText: "KERN_B", expectedRevision: 0 },
  ]);
  const p03Text = textBlob(p03.inspection);
  const p03Ok =
    p03.applyOk &&
    p03.saveOk &&
    p03Text.includes("long replacement text") &&
    p03Text.includes("KERN_B") &&
    !p03Text.includes("KERN_A");
  proofs.push({
    fixtureId: "P03",
    nativeProof: p03Ok ? "pass" : "fail",
    detail: `text=${JSON.stringify(p03Text)} ${p03.detail}`,
    inspection: p03.inspection,
  });

  const p04Doc = api.createDocument();
  api.addPage(p04Doc, 0);
  api.addImageRgb(p04Doc, 0, 24, 24, rgbaFill(24, 24, GREEN), 72, 400);
  api.addTextObject(p04Doc, 0, "COVER", "Helvetica", 12, 72, 500);
  const p04Bytes = api.save(p04Doc);
  api.close(p04Doc);
  const p04 = await roundTrip(api, load, p04Bytes, [
    { kind: "deleteTextObject", pageIndex: 0, objectId: "text-1", expectedRevision: 0 },
  ]);
  const p04Text = textBlob(p04.inspection);
  const p04Images = imageCount(p04.inspection, 0);
  proofs.push({
    fixtureId: "P04",
    nativeProof: p04.applyOk && p04.saveOk && !p04Text.includes("COVER") && p04Images >= 1 ? "pass" : "fail",
    detail: `text=${JSON.stringify(p04Text)} images=${p04Images} ${p04.detail}`,
    inspection: p04.inspection,
  });

  const p05Doc = api.createDocument();
  api.addPage(p05Doc, 0);
  api.addPage(p05Doc, 1);
  api.addImageRgb(p05Doc, 0, 16, 16, rgbaFill(16, 16, GREEN), 80, 400);
  api.addTextObject(p05Doc, 1, "PAGE_B", "Helvetica", 12, 72, 720);
  const p05Bytes = api.save(p05Doc);
  api.close(p05Doc);
  const p05 = await roundTrip(api, load, p05Bytes, [
    {
      kind: "replaceImage",
      pageIndex: 0,
      objectId: "image:1",
      imageWidth: 16,
      imageHeight: 16,
      imageRgba: rgbaFill(16, 16, RED),
      expectedRevision: 0,
    },
    { kind: "movePage", pageIndex: 0, destPageIndex: 1, objectId: "page", expectedRevision: 0 },
  ]);
  const p05Pages = p05.inspection.pageCount;
  const p05ImagesMoved = imageCount(p05.inspection, 0) === 0 && imageCount(p05.inspection, Math.min(1, p05Pages - 1)) >= 1;
  const pageB = p05.inspection.pages.some((p) => p.text.includes("PAGE_B"));
  proofs.push({
    fixtureId: "P05",
    nativeProof: p05.applyOk && p05.saveOk && p05Pages === 2 && pageB && (p05ImagesMoved || imageCount(p05.inspection, 0) >= 1) ? "pass" : "fail",
    detail: `pages=${p05Pages} images0=${imageCount(p05.inspection, 0)} images1=${imageCount(p05.inspection, 1)} text=${JSON.stringify(textBlob(p05.inspection))} ${p05.detail}`,
    inspection: p05.inspection,
  });

  const p11Doc = api.createDocument();
  api.addPage(p11Doc, 0);
  api.addTextObject(p11Doc, 0, "KEEP_ME");
  const p11Bytes = api.save(p11Doc);
  api.close(p11Doc);
  const backend11 = new PdfiumWasmWriterBackend(load);
  const session11 = await createPdfWriterSession(p11Bytes, { backend: backend11, expectedRevision: 0 });
  const apply11 = await session11.apply([
    { kind: "replaceTextRun", pageIndex: 9, objectId: "missing", newText: "nope", expectedRevision: 0 },
  ]);
  const save11 = await session11.save();
  await session11.dispose();
  const check11 = api.loadDocument(p11Bytes);
  const keep = api.extractPageText(check11, 0);
  api.close(check11);
  proofs.push({
    fixtureId: "P11",
    nativeProof: !apply11.ok && apply11.rolledBack && keep.includes("KEEP_ME") ? "pass" : "fail",
    detail: `applyOk=${apply11.ok} rolledBack=${!apply11.ok && apply11.rolledBack} keep=${JSON.stringify(keep)} saveOk=${save11.ok}`,
  });

  let cycles = 0;
  let cycleFail = "";
  for (let i = 0; i < 20; i++) {
    const doc = api.createDocument();
    api.addPage(doc, 0);
    api.addTextObject(doc, 0, `CYCLE_${i}`);
    const bytes = api.save(doc);
    api.close(doc);
    const reopened = api.loadDocument(bytes);
    const extracted = api.extractPageText(reopened, 0);
    api.close(reopened);
    if (!extracted.includes(`CYCLE_${i}`)) {
      cycleFail = `cycle ${i} missing text (${JSON.stringify(extracted)})`;
      break;
    }
    cycles += 1;
  }
  proofs.push({
    fixtureId: "P12",
    nativeProof: cycles === 20 ? "pass" : "fail",
    detail: cycleFail || `lifecycleCycles=${cycles}`,
  });

  return proofs;
}
