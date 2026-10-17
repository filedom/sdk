#!/usr/bin/env node
/**
 * Gate evidence completeness check (blueprint §7.2, §12.9).
 * Returns exit 2 when required proofs are not-run — never fabricates pass.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const scopeArg = process.argv.indexOf("--scope");
const scope = scopeArg >= 0 ? process.argv[scopeArg + 1] : "feasibility";

const gates = ["G1", "G2", "G3", "G4"];
let incomplete = 0;

for (const gate of gates) {
  const dir = join(root, "evidence", "gates", `${gate}-feasibility`);
  const recordPath = join(dir, "gate-record.json");
  if (!existsSync(recordPath)) {
    console.error(`[qa:gates] missing ${recordPath}`);
    incomplete++;
    continue;
  }
  const record = JSON.parse(readFileSync(recordPath, "utf8"));
  if (record.scope !== scope && record.scope !== "feasibility") {
    console.warn(`[qa:gates] ${gate} record scope=${record.scope} (requested ${scope})`);
  }
  if (record.status !== "passed") {
    console.log(`[qa:gates] ${gate}: ${record.status} — ${record.limitations ?? "no proof"}`);
    incomplete++;
  }
}

if (incomplete > 0) {
  console.log(`[qa:gates] scope=${scope} incomplete (${incomplete}/${gates.length} gates not passed)`);
  process.exit(2);
}

console.log(`[qa:gates] scope=${scope} all gate records passed`);
process.exit(0);
