import { test, expect } from "@playwright/test";

/** G3-INPUT-22: shell accessibility roles/labels (synthetic — not gate pass). */
test("demo shell exposes toolbar and canvas a11y hooks", async ({ page }) => {
  await page.goto("/");
  await expect.poll(async () => page.locator("body").getAttribute("data-engine-ready")).toBe("true");
  await expect(page.locator("#domdoc-toolbar")).toHaveAttribute("role", "toolbar");
  await expect(page.locator("#domdoc-toolbar")).toHaveAttribute("aria-label", /domdoc session shell/i);
  await expect(page.locator("#domdoc-canvas")).toHaveAttribute("role", "img");
  await expect(page.locator("#domdoc-canvas")).toHaveAttribute("aria-label", /rendered page preview/i);
  await expect(page.locator("#domdoc-ime-input")).toHaveAttribute("aria-label", /composition probe/i);
});
