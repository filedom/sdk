import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const angularPath = join(root, "angular.json");
const original = readFileSync(angularPath, "utf8");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

function withSlash(path) {
  const trimmed = path.trim();
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function rejectWasm(value, label) {
  if (value.includes("/wasm/")) {
    console.error(`${label} must not load from /wasm/: ${value}`);
    process.exit(1);
  }
}

const baseHref = withSlash(process.env.FILEDOM_BASE || "/sdk-docs/examples/angular/");
const bundles = withSlash(process.env.FILEDOM_EXAMPLES_BUNDLES || `/api/bundles/${pkg.version}/`);
rejectWasm(baseHref, "FILEDOM_BASE");
rejectWasm(bundles, "FILEDOM_EXAMPLES_BUNDLES");

const ng = join(root, "node_modules/@angular/cli/bin/ng.js");
if (!existsSync(ng)) {
  const declared = ["dependencies", "devDependencies"].flatMap((field) => Object.keys(pkg[field] ?? {}));
  console.error("Angular CLI is not installed, so this example was not built.");
  console.error("Dependencies declared in examples/angular/package.json (install belongs to the integration step):");
  for (const name of declared) console.error(`  ${name}`);
  process.exit(1);
}

const angular = JSON.parse(original);
const options = angular.projects.angular.architect.build.options;
options.baseHref = baseHref;
options.outputMode = "static";
options.define = { ...(options.define ?? {}), FILEDOM_EXAMPLES_BUNDLES: JSON.stringify(bundles) };
// Core reads wasm from disk only under Node. The browser bundle must not resolve that builtin.
options.externalDependencies = [...new Set([...(options.externalDependencies ?? []), "node:fs/promises"])];

let restored = false;
function restore() {
  if (restored) return;
  restored = true;
  writeFileSync(angularPath, original);
}

process.on("SIGINT", () => {
  restore();
  process.exit(130);
});
process.on("SIGTERM", () => {
  restore();
  process.exit(143);
});

writeFileSync(angularPath, `${JSON.stringify(angular, null, 2)}\n`);
const serve = process.argv.includes("serve");
try {
  const result = spawnSync(process.execPath, [ng, serve ? "serve" : "build"], { cwd: root, stdio: "inherit" });
  process.exitCode = result.status ?? 1;
  if (!serve && process.exitCode === 0) assertNoEngineWasm();
} finally {
  restore();
}

/** Engine bytes come from `FILEDOM_EXAMPLES_BUNDLES` at runtime, not from this build. */
function assertNoEngineWasm() {
  const out = join(root, "dist");
  const found = existsSync(out) ? wasmFiles(out) : [];
  if (!found.length) return;
  console.error("Angular output must not include engine wasm. Load bundles from FILEDOM_EXAMPLES_BUNDLES at runtime.");
  for (const file of found) console.error(`  ${file}`);
  process.exitCode = 1;
}

function wasmFiles(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) wasmFiles(path, found);
    else if (entry.name.endsWith(".wasm")) found.push(path);
  }
  return found;
}
