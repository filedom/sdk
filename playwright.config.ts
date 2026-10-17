import { defineConfig } from "@playwright/test";

/** G3-INPUT-04/05 — compositor smoke + @domdoc/demo wasm paint shell (not a G3 gate). */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  webServer: {
    command: "pnpm --filter @domdoc/demo run dev",
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    headless: true,
    viewport: { width: 800, height: 600 },
    baseURL: "http://127.0.0.1:5173",
  },
});
