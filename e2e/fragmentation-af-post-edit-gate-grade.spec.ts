import { test, expect } from "@playwright/test";

/** W2-G4-17: demo + WASM post-edit scale on authoritative browser path (gate still not-run). */
test("demo WASM post-edit gate-grade scale exposes dataset proof hooks", async ({ page }) => {
  await page.goto("/");
  await expect.poll(async () => page.locator("body").getAttribute("data-engine-ready")).toBe("true");
  expect(await page.locator("body").getAttribute("data-af-post-edit-scale-card")).toBe("W2-G4-17");
  expect(await page.locator("body").getAttribute("data-af-post-edit-breakpoints-per-entry")).toBe("3");
  expect(await page.locator("body").getAttribute("data-af-post-edit-all-equivalent")).toBe("true");
  expect(await page.locator("body").getAttribute("data-af-post-edit-authoritative-gate")).toBe(
    "not-run",
  );
});
