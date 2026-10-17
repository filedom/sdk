import { test, expect } from "@playwright/test";

/** G3-INPUT-05: demo shell loads compositor + browser WASM paint path. */
test("demo shell mounts canvas and runs wasm paint", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#domdoc-canvas")).toBeVisible();
  await expect.poll(async () => page.locator("body").getAttribute("data-engine-ready")).toBe("true");
  const paintItems = Number(await page.locator("body").getAttribute("data-paint-items"));
  expect(paintItems).toBeGreaterThan(0);
  expect(await page.locator("body").getAttribute("data-compositor-mounted")).toBe("true");
  expect(await page.locator("body").getAttribute("data-layout-stable")).toBe("true");
  await page.locator("#domdoc-toolbar-save-stub").click();
  await expect.poll(async () => page.locator("body").getAttribute("data-m2-toolbar-undo-depth")).toBe("1");
  await page.locator("#domdoc-toolbar-undo-stub").click();
  await expect.poll(async () => page.locator("body").getAttribute("data-m2-toolbar-redo-depth")).toBe("1");
});
