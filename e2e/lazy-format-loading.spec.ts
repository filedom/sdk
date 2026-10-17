import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";

/** Journey AO (partial): empty lazy shell defers display WASM until DOCX open. Gate not-run. */
const minimalOpenDocx = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/minimal-open.docx",
);

test("lazy shell loads DOCX module on demand (AO partial)", async ({ page }) => {
  await page.goto("/?eagerEngine=0");
  await expect(page.locator("#domdoc-canvas")).toBeVisible();
  await expect.poll(async () => page.locator("body").getAttribute("data-ao-lazy-shell")).toBe("true");
  await expect.poll(async () => page.locator("body").getAttribute("data-engine-ready")).toBe(
    "lazy-deferred",
  );
  expect(await page.locator("body").getAttribute("data-ao-format-modules-loaded")).toBeFalsy();

  await page.locator("#domdoc-open-local").setInputFiles(minimalOpenDocx);
  await expect.poll(async () => page.locator("body").getAttribute("data-f01-open-ok")).toBe("true");
  await expect.poll(async () =>
    page.locator("body").getAttribute("data-ao-format-modules-loaded"),
  ).toContain("docx-adapter");
});
