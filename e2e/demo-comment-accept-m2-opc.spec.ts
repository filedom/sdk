import { test, expect } from "@playwright/test";

/** M2/F20: comment panel accept applies review OPC patch on minimal tracked fixture. */
test("comment accept wires review OPC patch", async ({ page }) => {
  await page.goto("/");
  await expect.poll(async () => page.locator("body").getAttribute("data-engine-ready")).toBe("true");
  await page.locator("#domdoc-comments-accept-stub").click();
  await expect.poll(async () => page.locator("body").getAttribute("data-m2-comment-accept-applied")).toBe(
    "true",
  );
  expect(await page.locator("body").getAttribute("data-m2-comment-accept-opc-applied")).toBe("true");
  expect(await page.locator("body").getAttribute("data-m2-comment-accept-detail")).toBe(
    "review-opc-patch-applied",
  );
  expect(await page.locator("body").getAttribute("data-m2-comment-accept-suggestion-id")).toBe("10");
});
