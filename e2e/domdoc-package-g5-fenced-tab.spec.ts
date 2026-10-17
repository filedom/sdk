import { test, expect } from "@playwright/test";

/** G5/F42: fenced multi-tab writer conflict + crash-safe commit abort (gate not-run). */
test("G5 fenced tab conflict and crash-safe abort surfaced on demo", async ({ page }) => {
  await page.goto("/");
  await expect.poll(async () => page.locator("body").getAttribute("data-engine-ready")).toBe("true");

  expect(await page.locator("body").getAttribute("data-g5-fenced-tab-conflict-ok")).toBe("false");
  expect(await page.locator("body").getAttribute("data-g5-fenced-tab-conflict-detail")).toBe(
    "fenced-tab-writer-other-tab-active",
  );
  expect(await page.locator("body").getAttribute("data-g5-fenced-tab-writer-ok")).toBe("true");
  expect(await page.locator("body").getAttribute("data-g5-crash-safe-abort-ok")).toBe("false");
  expect(await page.locator("body").getAttribute("data-g5-crash-safe-manifest-committed")).toBe("false");
  expect(await page.locator("body").getAttribute("data-g5-crash-safe-abort-detail")).toBe(
    "aborted-at-commit-indexeddb-manifest-transaction",
  );
});
