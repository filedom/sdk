import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";

const minimalOpenDocx = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/minimal-open.docx",
);

/** G3-INPUT-05: demo shell loads compositor + browser WASM paint path. */
test("demo shell mounts canvas and runs wasm paint", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#domdoc-canvas")).toBeVisible();
  await expect.poll(async () => page.locator("body").getAttribute("data-engine-ready")).toBe("true");
  const paintItems = Number(await page.locator("body").getAttribute("data-paint-items"));
  expect(paintItems).toBeGreaterThan(0);
  expect(await page.locator("body").getAttribute("data-compositor-mounted")).toBe("true");
  expect(await page.locator("body").getAttribute("data-layout-stable")).toBe("true");
  await page.locator("#domdoc-toolbar-save-stub").click();
  await expect.poll(async () => page.locator("body").getAttribute("data-m2-toolbar-undo-depth")).toBe("1");
  await expect.poll(async () => page.locator("body").getAttribute("data-m2-domdoc-save-ok")).toBe("true");
  await page.locator("#domdoc-toolbar-undo-stub").click();
  await expect.poll(async () => page.locator("body").getAttribute("data-m2-toolbar-redo-depth")).toBe("1");
  await expect(page.locator("#domdoc-prosemirror-edit")).toBeVisible();
  expect(await page.locator("body").getAttribute("data-m1-prosemirror-slice")).toBe("true");
  expect(await page.locator("body").getAttribute("data-m1-domdoc-package-round-trip-ok")).toBe("true");
  await page.locator("#domdoc-prosemirror-edit").fill("edited paragraph");
  await page.locator("#domdoc-prosemirror-edit").dispatchEvent("change");
  await expect.poll(async () => {
    const rev = Number(await page.locator("body").getAttribute("data-m1-prosemirror-revision"));
    return rev >= 1;
  }).toBe(true);
  expect(await page.locator("body").getAttribute("data-m1-prosemirror-toolbar-undo-bound")).toBe("true");
  await page.locator("#domdoc-toolbar-undo-stub").click();
  await expect.poll(async () => page.locator("body").getAttribute("data-m1-prosemirror-paragraph")).toBe("domdoc");
  const exportBytes = Number(await page.locator("body").getAttribute("data-m1-docx-export-bytes"));
  expect(exportBytes).toBeGreaterThan(100);
  expect(await page.locator("body").getAttribute("data-m5-react-adapter")).toBe(
    "framework-adapter-stub",
  );
  expect(await page.locator("body").getAttribute("data-m5-vue-adapter")).toBe("framework-adapter-stub");
  expect(await page.locator("body").getAttribute("data-m5-lit-adapter")).toBe("framework-adapter-stub");
  expect(await page.locator("body").getAttribute("data-m5-angular-adapter")).toBe(
    "framework-adapter-stub",
  );
  expect(await page.locator("body").getAttribute("data-m5-svelte-adapter")).toBe(
    "framework-adapter-stub",
  );
  expect(await page.locator("body").getAttribute("data-m5-next-host-adapter")).toBe(
    "framework-adapter-stub",
  );
  expect(await page.locator("body").getAttribute("data-m1-export-policy")).toBe("domdoc-package");
  expect(await page.locator("body").getAttribute("data-m1-export-uses-package-envelope")).toBe(
    "true",
  );
  expect(await page.locator("body").getAttribute("data-m5-preact-adapter")).toBe(
    "framework-adapter-stub",
  );
  expect(await page.locator("body").getAttribute("data-m5-solid-adapter")).toBe(
    "framework-adapter-stub",
  );
  expect(Number(await page.locator("body").getAttribute("data-m5-comments-wire-count"))).toBe(2);
  await expect(page.locator("#domdoc-comments-list li")).toHaveCount(1);
  await page.locator("#domdoc-open-local").setInputFiles(minimalOpenDocx);
  await expect.poll(async () => page.locator("body").getAttribute("data-f01-open-ok")).toBe("true");
  await expect.poll(async () => page.locator("body").getAttribute("data-m1-prosemirror-paragraph")).toBe(
    "opened-local",
  );
});
