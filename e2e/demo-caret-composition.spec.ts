import { test, expect } from "@playwright/test";

/** G3-INPUT-06/24: caret + composition hook datasets (no OS IME in CI). */
test("demo exposes caret offset and composition input", async ({ page }) => {
  await page.goto("/");
  await expect.poll(async () => page.locator("body").getAttribute("data-engine-ready")).toBe("true");
  await expect(page.getByRole("textbox", { name: /composition probe/i })).toBeAttached();
  const caret = await page.locator("body").getAttribute("data-caret-offset");
  expect(Number(caret)).toBeGreaterThanOrEqual(0);
  const ime = page.getByRole("textbox", { name: /composition probe/i });
  await ime.focus();
  await ime.evaluate((el) => {
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
  expect(await page.locator("body").getAttribute("data-composition-preedit")).toBe("あ");
});

test("demo composition preedit updates before commit", async ({ page }) => {
  await page.goto("/");
  await expect.poll(async () => page.locator("body").getAttribute("data-engine-ready")).toBe("true");
  const ime = page.getByRole("textbox", { name: /composition probe/i });
  await ime.focus();
  await ime.evaluate((el) => {
    el.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" }));
    el.dispatchEvent(
      new CompositionEvent("compositionupdate", { bubbles: true, data: "か" }),
    );
  });
  await expect.poll(async () => page.locator("body").getAttribute("data-composition-state")).toBe("active");
  await expect.poll(async () => page.locator("body").getAttribute("data-composition-preedit")).toBe("か");
});
