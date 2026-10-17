import { test, expect } from "@playwright/test";

/** W2-G4-03 browser probe: shaped layout JSON stable across repeated WASM calls. */
test("demo reports stable shaped layout passes", async ({ page }) => {
  await page.goto("/");
  await expect.poll(async () => page.locator("body").getAttribute("data-engine-ready")).toBe("true");
  expect(await page.locator("body").getAttribute("data-layout-stable")).toBe("true");
  expect(await page.locator("body").getAttribute("data-shaping-backend")).toBe("flow-fallback");
});
