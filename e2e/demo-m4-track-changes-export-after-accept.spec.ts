import { test, expect } from "@playwright/test";

/** M4/F39: track-changes export attrs after comment accept (G2 slice, gate not-run). */
test("M4 track-changes export attrs after accept", async ({ page }) => {
  await page.goto("/");
  await expect.poll(async () => page.locator("body").getAttribute("data-engine-ready")).toBe("true");

  await page.locator("#domdoc-comments-accept-stub").click();
  await expect.poll(async () => page.locator("body").getAttribute("data-m2-comment-accept-applied")).toBe(
    "true",
  );

  expect(await page.locator("body").getAttribute("data-m4-docx-track-changes-export-ok")).toBe("true");
  expect(await page.locator("body").getAttribute("data-m4-docx-track-changes-export-feature")).toBe("F39");
  expect(await page.locator("body").getAttribute("data-m4-docx-track-changes-has-ins")).toBe("false");
  expect(await page.locator("body").getAttribute("data-m4-docx-track-changes-tracked-preserved")).toBe(
    "false",
  );
});
