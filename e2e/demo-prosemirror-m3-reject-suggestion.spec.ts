import { test, expect } from "@playwright/test";

/** M3/F34: ProseMirror demo reject suggestion button applies OPC reject stub. */
test("ProseMirror reject suggestion sets m3 attrs", async ({ page }) => {
  await page.goto("/");
  await expect.poll(async () => page.locator("body").getAttribute("data-engine-ready")).toBe("true");
  const rejectButton = page.locator("#domdoc-prosemirror-reject-suggestion-stub");
  await expect(rejectButton).toBeVisible();
  await rejectButton.click();
  expect(await page.locator("body").getAttribute("data-m3-prosemirror-reject-applied")).toBe("true");
  expect(await page.locator("body").getAttribute("data-m3-prosemirror-reject-detail")).toBe(
    "review-opc-patch-reject-applied",
  );
  expect(await page.locator("body").getAttribute("data-m3-prosemirror-reject-suggestion-id")).toBe(
    "10",
  );
});
