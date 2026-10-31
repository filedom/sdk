import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const wasmRoot = fileURLToPath(new URL("../../../domdoc-wasm", import.meta.url));

export default defineConfig({
  server: { fs: { allow: [wasmRoot, fileURLToPath(new URL(".", import.meta.url))] } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
