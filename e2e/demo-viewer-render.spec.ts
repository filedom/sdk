import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
const minimalOpenDocx = path.join(e2eDir, "fixtures/minimal-open.docx");
const samplePdf = path.join(e2eDir, "fixtures/sample.pdf");

async function expectCanvasRendered(page: import("@playwright/test").Page): Promise<void> {
  await expect.poll(async () => {
    const w = Number(await page.locator("body").getAttribute("data-viewer-canvas-width"));
    return w;
  }).toBeGreaterThan(100);
  await expect.poll(async () => {
    const h = Number(await page.locator("body").getAttribute("data-viewer-canvas-height"));
    return h;
  }).toBeGreaterThan(100);
  await expect.poll(async () => {
    return Number(await page.locator("body").getAttribute("data-paint-items"));
  }).toBeGreaterThan(0);
}

test("opening DOCX paints a non-empty canvas", async ({ page }) => {
  await page.goto("/");
  await expect.poll(async () => page.locator("body").getAttribute("data-engine-ready")).toBe("true");
  await expectCanvasRendered(page);

  await page.locator("#domdoc-open-local").setInputFiles(minimalOpenDocx);
  await expect.poll(async () => page.locator("body").getAttribute("data-f01-open-ok")).toBe("true");
  await expect.poll(async () => page.locator("body").getAttribute("data-f01-open-kind")).toBe("docx");
  await expectCanvasRendered(page);
  await expect(page.locator("#domdoc-status")).toContainText("DOCX");
});

test("opening PDF paints via PDF.js in the browser", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await expect.poll(async () => page.locator("body").getAttribute("data-engine-ready")).toBe("true");

  await page.locator("#domdoc-open-local").setInputFiles(samplePdf);
  await expect.poll(async () => page.locator("body").getAttribute("data-f01-open-kind")).toBe("pdf");
  await expect
    .poll(async () => page.locator("body").getAttribute("data-f01-open-ok"), { timeout: 45_000 })
    .toBe("true");
  await expect.poll(async () => page.locator("body").getAttribute("data-pdf-js-render")).toBe("true");
  await expectCanvasRendered(page);
  await expect(page.locator("#domdoc-status")).toContainText("PDF");
});
