import { test, expect } from "@playwright/test";

/** G3-INPUT-06: caret + composition hook datasets (no OS IME in CI). */
test("demo exposes caret offset and composition input", async ({ page }) => {
  await page.goto("/");
  await expect.poll(async () => page.locator("body").getAttribute("data-engine-ready")).toBe("true");
  await expect(page.locator("#domdoc-ime-input")).toBeAttached();
  const caret = await page.locator("body").getAttribute("data-caret-offset");
  expect(Number(caret)).toBeGreaterThanOrEqual(0);
  await page.locator("#domdoc-ime-input").focus();
  await page.locator("#domdoc-ime-input").evaluate((el) => {
    el.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" }));
    el.dispatchEvent(
      new CompositionEvent("compositionupdate", { bubbles: true, data: "あ" }),
    );
    el.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "あ" }));
  });
  await expect.poll(async () =>
    page.locator("body").getAttribute("data-composition-state"),
  ).toBe("committed");
  expect(Number(await page.locator("body").getAttribute("data-composition-inserted"))).toBe(1);
});
