import { test, expect } from "@playwright/test";

/** W2-G4-17 / G2: demo WASM paint + incremental post-edit equivalence hooks (gate not-run). */
test("demo incremental layout runs on WASM paint path", async ({ page }) => {
  await page.goto("/");
  await expect.poll(async () => page.locator("body").getAttribute("data-engine-ready")).toBe("true");
  const paintItems = Number(await page.locator("body").getAttribute("data-paint-items"));
  expect(paintItems).toBeGreaterThan(0);
  expect(await page.locator("body").getAttribute("data-layout-stable")).toBe("true");
  expect(await page.locator("body").getAttribute("data-af-post-edit-scale-card")).toBe("W2-G4-17");
  expect(await page.locator("body").getAttribute("data-af-post-edit-all-equivalent")).toBe("true");
  expect(await page.locator("body").getAttribute("data-af-post-edit-authoritative-gate")).toBe(
    "not-run",
  );
});
