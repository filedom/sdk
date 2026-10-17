#!/usr/bin/env node
/**
 * W2-G4-18: run authoritative G4 gate proof runner (node WASM path; browser via demo/e2e).
 */
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const test = spawnSync(
  "pnpm",
  ["--filter", "@domdoc/core", "test", "fragmentation-af-authoritative-gate-proof-runner"],
  { cwd: root, stdio: "inherit", shell: true },
);
process.exit(test.status ?? 1);
