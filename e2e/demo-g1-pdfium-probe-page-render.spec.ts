import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const probeAdapter = path.join(webRoot, "vendor/pdfium-lib-probe/domdoc-probe-adapter.mjs");
const probeVendorPresent = existsSync(probeAdapter);

test("G1 pdfium-lib probe page render path when vendor present", async ({ page }) => {
  test.skip(!probeVendorPresent, "vendor/pdfium-lib-probe not checked in");
  test.setTimeout(90_000);

  await page.goto("/?g1PdfiumProbePageRender=1");
  await expect(page.locator("body")).toHaveAttribute("data-g1-pdfium-probe-page-render-requested", "true");
  await expect
    .poll(async () => page.locator("body").getAttribute("data-g1-pdfium-probe-present"), {
      timeout: 30_000,
    })
    .toBe("true");
  await expect
    .poll(async () => page.locator("body").getAttribute("data-g1-pdfium-probe-render"), {
      timeout: 30_000,
    })
    .toBe("loaded");
  await expect
    .poll(async () => page.locator("body").getAttribute("data-g1-pdfium-probe-page-render-ok"), {
      timeout: 45_000,
    })
    .toBe("true");
  const bytes = Number(await page.locator("body").getAttribute("data-g1-pdfium-probe-page-bitmap-bytes"));
  expect(bytes).toBeGreaterThan(0);
});
