import { test, expect } from "@playwright/test";

/** M3/F25: debounced typing flush exposes persist + export receipt data attrs. */
test("ProseMirror debounced save sets m3 receipt attrs", async ({ page }) => {
  await page.goto("/");
  await expect.poll(async () => page.locator("body").getAttribute("data-engine-ready")).toBe("true");
  const editor = page.locator("#domdoc-prosemirror-edit");
  await expect(editor).toBeVisible();
  await editor.fill("debounced m3 save");
  await expect.poll(async () => page.locator("body").getAttribute("data-m1-prosemirror-debounced-pending")).toBe(
    "true",
  );
  await expect.poll(
    async () => page.locator("body").getAttribute("data-m1-prosemirror-debounced-pending"),
    { timeout: 2000 },
  ).toBe("false");
  await expect.poll(async () => {
    const persisted = Number(await page.locator("body").getAttribute("data-m3-persist-receipt-persisted"));
    return persisted >= 1;
  }).toBe(true);
  expect(await page.locator("body").getAttribute("data-m3-persist-receipt-committed")).toBe(
    await page.locator("body").getAttribute("data-m3-persist-receipt-persisted"),
  );
  await expect.poll(async () => {
    const exported = Number(await page.locator("body").getAttribute("data-m3-export-receipt-exported"));
    return exported >= 1;
  }).toBe(true);
  expect(await page.locator("body").getAttribute("data-m3-export-receipt-feature")).toBe("F25");
});
