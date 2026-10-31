#!/usr/bin/env node
// Build each example with its public base and stage the static output.
//
//   node scripts/build-examples.mjs [--only <fw>[,<fw>]] [--out <dir>]
//
// Each build runs `pnpm run build` in examples/<fw> with DOMDOC_BASE=/sdk-docs/examples/<fw>/.
// DOMDOC_EXAMPLES_BUNDLES is passed through unchanged when set. Output goes to
// <out>/<fw>/ (default dist/examples/<fw>/). A W0 shell build is reported as
// "not built yet" and is not an error.
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  BASE_ENV,
  DEFAULT_STAGING,
  EXAMPLES_ROOT,
  FRAMEWORKS,
  OUTPUT_CANDIDATES,
  SDK_ROOT,
  exampleBase,
  findOutputDir,
  isPlaceholderBuild,
  parseOnly,
  readExamplePackage,
  readFlag,
} from "./site-lib.mjs";

export const NOT_BUILT = "not built yet";

function runPnpmBuild(cwd, env) {
  const result = spawnSync("pnpm", ["run", "build"], { cwd, env, stdio: "inherit", shell: process.platform === "win32" });
  if (result.error) return { code: 1, detail: result.error.message };
  return { code: result.status ?? 1, detail: result.signal ? `killed by ${result.signal}` : undefined };
}

/**
 * Build and stage the given frameworks. Returns one result per framework; a
 * failure does not stop the others.
 */
export function buildExamples({
  frameworks = FRAMEWORKS,
  examplesRoot = EXAMPLES_ROOT,
  staging = DEFAULT_STAGING,
  env = process.env,
  run = runPnpmBuild,
  log = console.log,
} = {}) {
  const results = [];
  for (const fw of frameworks) {
    const exampleDir = join(examplesRoot, fw);
    const out = join(staging, fw);
    const pkg = readExamplePackage(examplesRoot, fw);
    if (!pkg) {
      results.push({ fw, status: "failed", detail: `${fw}: no package.json in ${relative(SDK_ROOT, exampleDir) || exampleDir}` });
      continue;
    }
    if (isPlaceholderBuild(pkg)) {
      results.push({ fw, status: NOT_BUILT, detail: `${fw}: ${NOT_BUILT} (examples/${fw} has a placeholder build script)` });
      continue;
    }
    log(`build-examples: ${fw} with ${BASE_ENV}=${exampleBase(fw)}`);
    const { code, detail } = run(exampleDir, { ...env, [BASE_ENV]: exampleBase(fw) });
    if (code !== 0) {
      results.push({ fw, status: "failed", detail: `${fw}: build failed (exit ${code}${detail ? `, ${detail}` : ""})` });
      continue;
    }
    const built = findOutputDir(exampleDir, fw);
    if (!built) {
      const tried = OUTPUT_CANDIDATES[fw].map((p) => `examples/${fw}/${p}/index.html`).join(", ");
      results.push({ fw, status: "failed", detail: `${fw}: build finished but wrote no index.html (looked for ${tried})` });
      continue;
    }
    rmSync(out, { recursive: true, force: true });
    mkdirSync(out, { recursive: true });
    cpSync(built, out, { recursive: true });
    results.push({ fw, status: "built", out, detail: `${fw}: built into ${relative(SDK_ROOT, out) || out}` });
  }
  return results;
}

export function summarize(results, log = console.log) {
  for (const r of results) log(`  ${r.status === "built" ? "ok  " : r.status === NOT_BUILT ? "skip" : "FAIL"} ${r.detail}`);
  const failed = results.filter((r) => r.status === "failed");
  if (failed.length) log(`build-examples: ${failed.length} failed: ${failed.map((r) => r.fw).join(", ")}`);
  return failed.length === 0;
}

function main(argv) {
  const frameworks = parseOnly(argv);
  const outFlag = readFlag(argv, "--out");
  const staging = outFlag ? resolve(outFlag) : DEFAULT_STAGING;
  const results = buildExamples({ frameworks, staging });
  console.log(`build-examples: staging ${relative(SDK_ROOT, staging) || staging}`);
  return summarize(results) ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(`build-examples: ${error.message}`);
    process.exitCode = 1;
  }
}
