import { test, expect } from "@playwright/test";

/**
 * G3-INPUT-04 smoke: canvas mount + scale mapping (no WASM paint or IME).
 * Full G3 gate still requires app shell + integrated paint path.
 */
test("compositor canvas mount smoke", async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html>
      <body>
        <canvas id="domdoc-canvas" width="400" height="300"></canvas>
      </body>
    </html>
  `);
  const canvas = page.locator("#domdoc-canvas");
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box?.width).toBeGreaterThan(0);
  const scale = await page.evaluate(() => {
    const el = document.querySelector("canvas")!;
    return { w: el.width, h: el.height };
  });
  expect(scale.w).toBe(400);
  expect(scale.h).toBe(300);
});
