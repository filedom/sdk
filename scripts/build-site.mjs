#!/usr/bin/env node
// Compose the /sdk-docs/ static tree in apps/docs/build.
//
//   node scripts/build-site.mjs [--skip-docs] [--skip-examples] [--only <fw>[,<fw>]] [--staging <dir>] [--strict]
//
// 1. `pnpm run build` in apps/docs (skipped with --skip-docs; the build must exist).
// 2. build-examples for the chosen frameworks (skipped with --skip-examples; staging is reused).
// 3. Copy <staging>/<fw>/ to apps/docs/build/examples/<fw>/ and write samples/hello.pdf.
// 4. Fail if the build mentions filedom.dev or an example references /wasm/.
// --strict also fails when any chosen example has no staged output.
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildExamples, summarize } from "./build-examples.mjs";
import {
  DEFAULT_STAGING,
  DOCS_BUILD,
  DOCS_ROOT,
  FORBIDDEN_PREFIX,
  FRAMEWORKS,
  SAMPLE_PDF_PATH,
  SDK_ROOT,
  SITE_BASE,
  filesContaining,
  helloPdf,
  isDir,
  isFile,
  parseOnly,
  readFlag,
} from "./site-lib.mjs";

export const RETIRED_HOST = "filedom.dev";

/** Copy staged examples and the sample into `buildDir`, then scan it. */
export function composeSite({ buildDir = DOCS_BUILD, staging = DEFAULT_STAGING, frameworks = FRAMEWORKS } = {}) {
  if (!isDir(buildDir)) throw new Error(`docs build not found at ${buildDir}; run without --skip-docs`);
  const copied = [];
  const missing = [];
  for (const fw of frameworks) {
    const from = join(staging, fw);
    const to = join(buildDir, "examples", fw);
    rmSync(to, { recursive: true, force: true });
    if (!isFile(join(from, "index.html"))) {
      missing.push(fw);
      continue;
    }
    mkdirSync(to, { recursive: true });
    cpSync(from, to, { recursive: true });
    copied.push(fw);
  }
  const sample = join(buildDir, ...SAMPLE_PDF_PATH.slice(SITE_BASE.length).split("/"));
  mkdirSync(join(sample, ".."), { recursive: true });
  writeFileSync(sample, helloPdf());
  return { copied, missing, sample, violations: scanSite(buildDir) };
}

/** Each string that must not appear in the composed build, with the files that hold it. */
export function scanSite(buildDir) {
  const violations = [];
  const retired = filesContaining(buildDir, RETIRED_HOST);
  if (retired.length) violations.push({ needle: RETIRED_HOST, files: retired });
  const wasm = filesContaining(join(buildDir, "examples"), FORBIDDEN_PREFIX);
  if (wasm.length) violations.push({ needle: FORBIDDEN_PREFIX, files: wasm });
  return violations;
}

function buildDocs() {
  console.log("build-site: docusaurus build in apps/docs");
  const result = spawnSync("pnpm", ["run", "build"], { cwd: DOCS_ROOT, stdio: "inherit", shell: process.platform === "win32" });
  if (result.error) throw new Error(`docs build could not start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`docs build failed (exit ${result.status ?? result.signal})`);
}

function main(argv) {
  const frameworks = parseOnly(argv);
  const stagingFlag = readFlag(argv, "--staging");
  const staging = stagingFlag ? resolve(stagingFlag) : DEFAULT_STAGING;
  const strict = argv.includes("--strict");
  let ok = true;

  if (!argv.includes("--skip-docs")) buildDocs();
  if (!argv.includes("--skip-examples")) ok = summarize(buildExamples({ frameworks, staging })) && ok;

  const { copied, missing, sample, violations } = composeSite({ staging, frameworks });
  const rel = (p) => relative(SDK_ROOT, p) || p;
  console.log(`build-site: examples copied: ${copied.join(", ") || "none"}`);
  if (missing.length) {
    console.log(`build-site: not built yet: ${missing.join(", ")}`);
    if (strict) ok = false;
  }
  console.log(`build-site: sample at ${rel(sample)}`);
  for (const v of violations) {
    console.error(`build-site: "${v.needle}" found in:\n${v.files.map((f) => `  ${rel(f)}`).join("\n")}`);
    ok = false;
  }
  console.log(ok ? `build-site: ${rel(DOCS_BUILD)} is ready for ${SITE_BASE}` : "build-site: failed");
  return ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(`build-site: ${error.message}`);
    process.exitCode = 1;
  }
}
