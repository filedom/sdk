#!/usr/bin/env node
// Fails when the retired docs domain appears anywhere in apps/docs.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const RETIRED = ["domdoc", "dev"].join(".");
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SKIP = new Set(["node_modules", "build", ".docusaurus", ".cache-loader"]);

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.isFile()) yield path;
  }
}

const hits = [];
for (const file of walk(ROOT)) {
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, index) => {
      if (line.includes(RETIRED)) hits.push(`${relative(ROOT, file)}:${index + 1}`);
    });
}

if (hits.length > 0) {
  console.error(`${RETIRED} is retired; use https://domdoc.io instead:\n  ${hits.join("\n  ")}`);
  process.exit(1);
}

const config = readFileSync(join(ROOT, "docusaurus.config.ts"), "utf8");
const absolute = [];
for (const match of config.matchAll(/href:\s*"([^"]+)"/g)) {
  const href = match[1];
  if (/^https?:\/\//.test(href) && !href.startsWith("https://github.com/")) absolute.push(href);
}
if (absolute.length > 0) {
  console.error(`docs links must be relative to the domain:\n  ${absolute.join("\n  ")}`);
  process.exit(1);
}
if (!config.includes('href="/"')) {
  console.error('the link back to the site must be href="/"');
  process.exit(1);
}
console.log(`check-domains: no ${RETIRED} references in apps/docs`);
