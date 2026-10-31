import { defineConfig } from "vitest/config";

// solid-js resolves to its no-op server build unless the browser condition is set.
export default defineConfig({ resolve: { conditions: ["browser"] }, test: { environment: "happy-dom" } });
