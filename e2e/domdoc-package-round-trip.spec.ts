import { test, expect } from "@playwright/test";

/** F21/G5: .domdoc stub package save/load round-trip surfaced on demo shell. */
test("domdoc package round-trip ok on demo boot", async ({ page }) => {
  await page.goto("/");
  await expect.poll(async () => page.locator("body").getAttribute("data-engine-ready")).toBe("true");
  await expect.poll(async () =>
    page.locator("body").getAttribute("data-m1-domdoc-package-round-trip-ok"),
  ).toBe("true");
  await expect.poll(async () =>
    page.locator("body").getAttribute("data-m1-domdoc-package-save-ok"),
  ).toBe("true");
});
