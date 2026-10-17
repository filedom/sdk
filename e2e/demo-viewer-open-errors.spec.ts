import { test, expect } from "@playwright/test";

test("unsupported local file surfaces an open error", async ({ page }) => {
  await page.goto("/?eagerEngine=0");
  await expect.poll(async () => page.locator("body").getAttribute("data-engine-ready")).toBe(
    "lazy-deferred",
  );

  await page.locator("#domdoc-open-local").setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("hello\n"),
  });
  await expect.poll(async () => page.locator("body").getAttribute("data-f01-open-ok")).toBe("false");
  await expect(page.locator("body")).toHaveAttribute("data-f01-open-error", /unsupported-kind/);
  await expect(page.locator("#domdoc-status")).toContainText("Unsupported");
});
