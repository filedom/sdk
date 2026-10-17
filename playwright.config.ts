import { defineConfig } from "@playwright/test";

/** G3-INPUT-04 minimal config — compositor mount smoke only (not a G3 gate). */
export default defineConfig({
  testDir: "./e2e",
  timeout: 15_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  use: {
    headless: true,
    viewport: { width: 800, height: 600 },
  },
});
