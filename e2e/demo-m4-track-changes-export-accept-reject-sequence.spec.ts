import { test, expect } from "@playwright/test";

/** M4/F39: tracked DOCX export attrs after accept then reject (demo sync, gate not-run). */
test("M4 track-changes export attrs after accept then reject", async ({ page }) => {
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

  await page.locator("#domdoc-prosemirror-reject-suggestion-stub").click();
  expect(await page.locator("body").getAttribute("data-m3-prosemirror-reject-applied")).toBe("false");
  expect(await page.locator("body").getAttribute("data-m4-docx-track-changes-export-ok")).toBe("true");
  expect(await page.locator("body").getAttribute("data-m4-docx-track-changes-export-feature")).toBe("F39");
  expect(await page.locator("body").getAttribute("data-m4-docx-track-changes-has-ins")).toBe("false");
});
