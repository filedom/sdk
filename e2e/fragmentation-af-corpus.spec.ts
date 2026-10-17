import { test, expect } from "@playwright/test";

/** W2-G4-05: AF browser corpus with live WASM shaped layout. */
test("demo AF corpus converges under live layout", async ({ page }) => {
  await page.goto("/");
  await expect.poll(async () => page.locator("body").getAttribute("data-engine-ready")).toBe("true");
  expect(await page.locator("body").getAttribute("data-af-corpus-count")).toBe("3");
  expect(await page.locator("body").getAttribute("data-af-corpus-converged")).toBe("true");
});
