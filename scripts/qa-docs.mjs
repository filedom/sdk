#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = join(root, "docs", "feature-registry.json");
const tasksDir = join(root, "docs", "tasks");

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!existsSync(registryPath)) {
  console.error("[qa:docs] missing feature-registry.json");
  process.exit(1);
}

JSON.parse(readFileSync(registryPath, "utf8"));

const cards = readdirSync(tasksDir).filter((f) => f.endsWith(".md") && f !== "README.md");
if (cards.length < 5) {
  console.error("[qa:docs] expected W0/W1 task cards");
  process.exit(1);
}

run("pnpm", ["--filter", "@domdoc/core", "build"]);
run("pnpm", ["generate:synthetic-gate-grade-log"]);

const g3LogsDir = join(root, "evidence", "gates", "G3-feasibility", "logs");
for (const file of ["gate-grade-ime_gate_grade-synthetic-ci.json", "gate-grade-sr_gate_grade-synthetic-ci.json"]) {
  const path = join(g3LogsDir, file);
  if (!existsSync(path)) {
    console.error(`[qa:docs] missing synthetic gate-grade log ${file}`);
    process.exit(1);
  }
  const log = JSON.parse(readFileSync(path, "utf8"));
  if (log.synthetic !== true || log.gateStatus !== "not-run") {
    console.error(`[qa:docs] invalid synthetic gate-grade log ${file}`);
    process.exit(1);
  }
}

console.log(`[qa:docs] ok — ${cards.length} task cards, registry present, synthetic G3 logs refreshed`);
process.exit(0);
