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

async function expectCanvasVisiblePixels(page: import("@playwright/test").Page): Promise<void> {
  const metrics = await page.evaluate(() => {
    const canvas = document.getElementById("domdoc-canvas") as HTMLCanvasElement | null;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    let nonWhite = 0;
    const w = canvas.width;
    const h = canvas.height;
    for (let y = 0; y < h; y += 4) {
      for (let x = 0; x < w; x += 4) {
        const d = ctx.getImageData(x, y, 1, 1).data;
        if (d[0]! + d[1]! + d[2]! < 750) nonWhite += 1;
      }
    }
    return {
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight,
      nonWhite,
    };
  });
  expect(metrics).not.toBeNull();
  expect(metrics!.clientWidth).toBeGreaterThan(50);
  expect(metrics!.clientHeight).toBeGreaterThan(50);
  expect(metrics!.nonWhite).toBeGreaterThan(0);
}

test("opening DOCX paints a non-empty canvas", async ({ page }) => {
  await page.goto("/");
  await expect.poll(async () => page.locator("body").getAttribute("data-engine-ready")).toBe("true");
  await expectCanvasRendered(page);

  await page.locator("#domdoc-open-local").setInputFiles(minimalOpenDocx);
  await expect.poll(async () => page.locator("body").getAttribute("data-f01-open-ok")).toBe("true");
  await expect.poll(async () => page.locator("body").getAttribute("data-f01-open-kind")).toBe("docx");
  await expectCanvasRendered(page);
  await expectCanvasVisiblePixels(page);
  await expect(page.locator("#domdoc-status")).toContainText("DOCX");
});

test("lazy shell opening DOCX paints visible pixels", async ({ page }) => {
  await page.goto("/?eagerEngine=0");
  await expect.poll(async () => page.locator("body").getAttribute("data-engine-ready")).toBe(
    "lazy-deferred",
  );
  await page.locator("#domdoc-open-local").setInputFiles(minimalOpenDocx);
  await expect.poll(async () => page.locator("body").getAttribute("data-f01-open-ok")).toBe("true");
  await expect.poll(async () => page.locator("body").getAttribute("data-engine-ready")).toBe("true");
  await expectCanvasRendered(page);
  await expectCanvasVisiblePixels(page);
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
  await expectCanvasVisiblePixels(page);
  await expect(page.locator("#domdoc-status")).toContainText("PDF");
});

test("lazy shell opening PDF paints visible pixels", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/?eagerEngine=0");
  await expect.poll(async () => page.locator("body").getAttribute("data-engine-ready")).toBe(
    "lazy-deferred",
  );
  await page.locator("#domdoc-open-local").setInputFiles(samplePdf);
  await expect
    .poll(async () => page.locator("body").getAttribute("data-f01-open-ok"), { timeout: 45_000 })
    .toBe("true");
  await expect.poll(async () => page.locator("body").getAttribute("data-f01-open-kind")).toBe("pdf");
  await expectCanvasRendered(page);
  await expectCanvasVisiblePixels(page);
});
