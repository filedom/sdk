#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = join(root, "docs", "feature-registry.json");
const tasksDir = join(root, "docs", "tasks");

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

console.log(`[qa:docs] ok — ${cards.length} task cards, registry present`);
process.exit(0);
