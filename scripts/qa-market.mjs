#!/usr/bin/env node
/**
 * Market comparison task stub (blueprint §12.8).
 * Missing H1–H3 scenario records remain not-measured — never fabricates pass.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const scenario = process.argv.slice(2).find((arg) => arg !== "--");

if (!scenario) {
  console.error("[qa:market] usage: pnpm qa:market -- <scenario>");
  console.error("[qa:market] example scenarios: h1-cold-open, h2-edit-scroll, h3-export-save");
  process.exit(2);
}

const recordDir = join(root, "evidence", "market");
const recordPath = join(recordDir, `${scenario}.json`);

if (!existsSync(recordPath)) {
  console.log(`[qa:market] scenario=${scenario} status=not-measured (missing ${recordPath})`);
  process.exit(2);
}

const record = JSON.parse(readFileSync(recordPath, "utf8"));
if (record.status !== "measured") {
  console.log(
    `[qa:market] scenario=${scenario} status=${record.status ?? "not-measured"} — gate not-run`,
  );
  process.exit(2);
}

console.log(`[qa:market] scenario=${scenario} status=measured runId=${record.runId ?? "unknown"}`);
process.exit(0);
