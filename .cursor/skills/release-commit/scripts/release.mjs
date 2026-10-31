#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LIMITS = {
  summary: 140,
  bullet: 90,
  bullets: 4,
};

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "target",
  "pkg",
  "coverage",
]);

const KNOWN_REPOS = [
  "domdoc-sdk",
  "domdoc-wasm",
  "domdoc-api",
  "domdoc-website",
  "domdoc-benchmarks",
];

function usage() {
  return [
    "Usage:",
    '  node release.mjs --shared [--root <workspace>] (--bump patch|minor|major | --version <x.y.z>) [--repo-summary <repo> "One sentence."] [--repo-bullet <repo> "Phrase"]... [--date "17 Oct 2026"] [--dry-run]',
  ].join("\n");
}

function parseArgs(argv) {
  const out = { bullets: [], dryRun: false, shared: false, notes: {} };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      return value;
    };
    if (arg === "--repo") out.repo = next();
    else if (arg === "--bump") out.bump = next();
    else if (arg === "--version") out.version = next();
    else if (arg === "--summary") out.summary = next();
    else if (arg === "--bullet") out.bullets.push(next());
    else if (arg === "--date") out.date = next();
    else if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--shared") out.shared = true;
    else if (arg === "--root") out.root = next();
    else if (arg === "--repo-summary") {
      const name = repoName(next());
      const summary = next();
      const note = noteFor(out, name);
      if (note.summary) throw new Error(`Duplicate summary for ${name}`);
      note.summary = summary;
    } else if (arg === "--repo-bullet") {
      const name = repoName(next());
      noteFor(out, name).bullets.push(next());
    } else if (arg === "--help" || arg === "-h") out.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function repoName(value) {
  const name = path.basename(String(value).replace(/\/+$/, ""));
  if (!name || name.startsWith("-")) throw new Error(`Not a repo name: ${value}`);
  return name;
}

function noteFor(out, name) {
  out.notes[name] ??= { bullets: [] };
  return out.notes[name];
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function escapeReg(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function bumpVersion(version, level) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) fail(`Version is not major.minor.patch: ${version}`);
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (level === "major") return `${major + 1}.0.0`;
  if (level === "minor") return `${major}.${minor + 1}.0`;
  if (level === "patch") return `${major}.${minor}.${patch + 1}`;
  fail(`Bump must be patch, minor, or major.`);
}

function targetVersion(from, args) {
  if (args.version && args.bump) fail("Pass --version or --bump, not both.");
  if (args.version) {
    if (!/^\d+\.\d+\.\d+$/.test(args.version)) {
      fail(`Version is not major.minor.patch: ${args.version}`);
    }
    if (args.version === from) fail(`Version is already ${from}.`);
    return args.version;
  }
  if (!args.bump) fail("Pass --version <x.y.z> or --bump patch|minor|major.");
  return bumpVersion(from, args.bump);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function resolveDate(date) {
  if (!date) return formatDate(new Date());
  const text = date.trim();
  if (!text || /[\r\n]/.test(text)) fail("Date must be one line.");
  return text;
}

function cleanSummary(summary) {
  const text = summary.replace(/\s+/g, " ").trim();
  if (!text) fail("Summary is empty.");
  if (text.includes("\n")) fail("Summary must be one line.");
  const sentence = /[.!?]$/.test(text) ? text : `${text}.`;
  if (sentence.length > LIMITS.summary) {
    fail(`Summary is ${sentence.length} characters. Keep it under ${LIMITS.summary}.`);
  }
  return sentence;
}

function cleanBullets(bullets) {
  if (bullets.length > LIMITS.bullets) {
    fail(`Use at most ${LIMITS.bullets} bullets.`);
  }
  return bullets.map((bullet) => {
    const text = bullet.replace(/\s+/g, " ").trim().replace(/[.]+$/, "");
    if (!text) fail("A bullet is empty.");
    if (text.length > LIMITS.bullet) {
      fail(`A bullet is ${text.length} characters. Keep each one under ${LIMITS.bullet}.`);
    }
    return text;
  });
}

function versionBumpOnlySummary(version) {
  return cleanSummary(`The version moved to ${version} to match the other repos.`);
}

function renderEntry(version, date, summary, bullets) {
  const lines = [`## ${version} — ${date}`, "", summary];
  if (bullets.length) {
    lines.push("", ...bullets.map((bullet) => `- ${bullet}`));
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function upsertChangelog(existing, entry, version) {
  const section = new RegExp(
    `## ${escapeReg(version)}(?: —[^\\n]*)?\\n[\\s\\S]*?(?=\\n## |$)`,
  );
  let text = (existing ?? "").replace(section, "").trim();
  if (!text) return `# Changelog\n\n${entry}`;
  if (!text.startsWith("# Changelog")) text = `# Changelog\n\n${text}`;
  const marker = text.search(/\n## /);
  if (marker === -1) return `${text.replace(/\s*$/, "\n\n")}${entry}`;
  const head = text.slice(0, marker).replace(/\s*$/, "\n\n");
  const rest = text.slice(marker + 1);
  return `${head}${entry}${rest.endsWith("\n") ? rest : `${rest}\n`}`;
}

function walk(dir, fileName, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, fileName, found);
    else if (entry.name === fileName) found.push(full);
  }
  return found;
}

function workspaceVersion(cargoText) {
  const section = cargoText.match(/\[workspace\.package\][^\[]*/);
  if (!section) return null;
  const version = section[0].match(/^version\s*=\s*"(\d+\.\d+\.\d+)"/m);
  return version ? version[1] : null;
}

function findCurrentVersion(repo) {
  const rootCargo = path.join(repo, "Cargo.toml");
  if (fs.existsSync(rootCargo)) {
    const version = workspaceVersion(fs.readFileSync(rootCargo, "utf8"));
    if (version) return version;
  }
  const counts = new Map();
  for (const file of walk(repo, "package.json")) {
    let json;
    try {
      json = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      continue;
    }
    if (typeof json.version !== "string") continue;
    counts.set(json.version, (counts.get(json.version) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function replacePackageVersion(text, from, to, { force = false } = {}) {
  const match = /("version"\s*:\s*")([^"]+)(")/.exec(text);
  if (!match || match[2] === to) return null;
  if (!force && match[2] !== from) return null;
  return text.slice(0, match.index) + match[1] + to + match[3] + text.slice(match.index + match[0].length);
}

function insertPackageVersion(text, version) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  if (lines.at(-1) === "") lines.pop();
  const versionLine = `  "version": "${version}",`;
  const nameIndex = lines.findIndex((line) => /^\s*"name"\s*:/.test(line));
  if (nameIndex === -1) {
    const brace = lines.findIndex((line) => line.trim() === "{");
    lines.splice(brace === -1 ? 0 : brace + 1, 0, versionLine);
  } else {
    if (!lines[nameIndex].trimEnd().endsWith(",")) {
      lines[nameIndex] = `${lines[nameIndex].replace(/\s*$/, "")},`;
    }
    lines.splice(nameIndex + 1, 0, versionLine);
  }
  return `${lines.join(eol)}${eol}`;
}

function replaceCargoVersions(text, from, to) {
  const pattern = new RegExp(`^version = "${escapeReg(from)}"$`, "gm");
  if (!pattern.test(text)) return null;
  return text.replace(new RegExp(`^version = "${escapeReg(from)}"$`, "gm"), `version = "${to}"`);
}

function replaceLockVersions(text, from, to) {
  const parts = text.split(/(?=\[\[package\]\])/);
  let changed = false;
  const next = parts.map((block) => {
    const name = block.match(/^name = "([^"]+)"/m);
    if (!name || !name[1].startsWith("domdoc-")) return block;
    const pattern = new RegExp(`^version = "${escapeReg(from)}"$`, "m");
    if (!pattern.test(block)) return block;
    changed = true;
    return block.replace(pattern, `version = "${to}"`);
  });
  return changed ? next.join("") : null;
}

function collectWrites(repo, from, to, changelog) {
  const writes = [];
  const changelogPath = path.join(repo, "CHANGELOG.md");
  const previous = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, "utf8") : "";
  if (previous && new RegExp(`^## ${escapeReg(to)}\\b`, "m").test(previous)) {
    fail(`CHANGELOG.md already has ${to}. Restore the previous version before running again.`);
  }
  writes.push({ file: changelogPath, text: upsertChangelog(previous, changelog, to) });

  if (from == null) {
    const rootPkg = path.join(repo, "package.json");
    const repoLabel = path.basename(repo);
    if (!fs.existsSync(rootPkg)) fail(`No package.json to add a version in ${repoLabel}.`);
    const text = fs.readFileSync(rootPkg, "utf8");
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      fail(`package.json in ${repoLabel} is not valid JSON.`);
    }
    if (typeof json.version === "string") {
      fail(`package.json in ${repoLabel} already has version ${json.version}.`);
    }
    writes.push({ file: rootPkg, text: insertPackageVersion(text, to) });
    return writes;
  }

  const rootPkg = path.join(repo, "package.json");
  for (const file of walk(repo, "package.json")) {
    const text = fs.readFileSync(file, "utf8");
    const updated = replacePackageVersion(text, from, to, { force: file === rootPkg });
    if (updated) writes.push({ file, text: updated });
  }

  for (const file of walk(repo, "Cargo.toml")) {
    const text = fs.readFileSync(file, "utf8");
    const updated = replaceCargoVersions(text, from, to);
    if (updated) writes.push({ file, text: updated });
  }

  const lock = path.join(repo, "Cargo.lock");
  if (fs.existsSync(lock)) {
    const updated = replaceLockVersions(fs.readFileSync(lock, "utf8"), from, to);
    if (updated) writes.push({ file: lock, text: updated });
  }

  const versionWrites = writes.filter((item) => item.file !== changelogPath);
  if (versionWrites.length === 0) fail(`No files are on version ${from}.`);
  return writes;
}

function git(repo, args) {
  return execFileSync(
    "git",
    [
      "--no-pager",
      "-c",
      "color.ui=false",
      "-c",
      "core.quotepath=false",
      "-c",
      "diff.noprefix=false",
      "-c",
      "diff.mnemonicPrefix=false",
      ...args,
    ],
    {
      cwd: repo,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

function hasHead(repo) {
  try {
    git(repo, ["rev-parse", "--verify", "--quiet", "HEAD"]);
    return true;
  } catch {
    return false;
  }
}

function dirtyStatus(repo) {
  return git(repo, ["status", "--porcelain", "--untracked-files=all"]).trim();
}

function changelogVersion(repo) {
  const file = path.join(repo, "CHANGELOG.md");
  if (!fs.existsSync(file)) return null;
  const match = fs.readFileSync(file, "utf8").match(/^## (\d+\.\d+\.\d+)\b/m);
  return match ? match[1] : null;
}

function baselineCommit(repo, version) {
  const out = git(repo, [
    "log",
    "--reverse",
    "--format=%H",
    "-S",
    `## ${version}`,
    "--",
    "CHANGELOG.md",
  ]).trim();
  return out ? out.split("\n")[0] : null;
}

function parentOf(repo, sha) {
  const line = git(repo, ["rev-list", "--parents", "-n", "1", sha]).trim();
  const parts = line.split(/\s+/);
  return parts.length > 1 ? parts[1] : null;
}

function changedFiles(repo, sha) {
  const parent = parentOf(repo, sha);
  const args = parent
    ? ["diff", "--name-only", parent, sha]
    : ["diff-tree", "--root", "--no-commit-id", "--name-only", "-r", sha];
  const out = git(repo, args).trim();
  return out ? out.split("\n").filter(Boolean) : [];
}

function patchFor(repo, sha, files) {
  const parent = parentOf(repo, sha);
  if (!parent) {
    return git(repo, ["diff-tree", "--root", "-p", "-U1", "--no-commit-id", sha, "--", ...files]);
  }
  return git(repo, ["diff", "-U1", parent, sha, "--", ...files]);
}

function changedLines(section) {
  return section.split("\n").filter((line) => {
    if (line.startsWith("+++") || line.startsWith("---")) return false;
    return line.startsWith("+") || line.startsWith("-");
  });
}

function isPackageVersionLine(line) {
  return /^[+-]\s*"version"\s*:\s*"[^"]*"\s*,?\s*$/.test(line);
}

function isCargoVersionLine(line) {
  return /^[+-]version = "\d+\.\d+\.\d+"\s*$/.test(line);
}

function lockHunksAreOwnVersion(section) {
  const hunks = section.split(/^@@/m).slice(1);
  if (hunks.length === 0) return changedLines(section).length === 0;
  for (const hunk of hunks) {
    const lines = changedLines(hunk);
    if (lines.length === 0) continue;
    if (!lines.every(isCargoVersionLine)) return false;
    const names = [...hunk.matchAll(/^[ +]name = "([^"]+)"/gm)].map((match) => match[1]);
    if (names.length === 0 || names.some((name) => !name.startsWith("domdoc-"))) return false;
  }
  return true;
}

function fileSectionTouchesCode(section) {
  const header = section.split("\n", 1)[0];
  const match = header.match(/ b\/(.+)$/);
  const filePath = match ? match[1] : "";
  if (filePath === "CHANGELOG.md") return false;
  const base = path.posix.basename(filePath);
  const lines = changedLines(section);
  if (base === "package.json") return lines.length > 0 && !lines.every(isPackageVersionLine);
  if (base === "Cargo.toml") return lines.length > 0 && !lines.every(isCargoVersionLine);
  if (base === "Cargo.lock") return !lockHunksAreOwnVersion(section);
  return true;
}

function patchTouchesCode(patch) {
  if (!patch.trim()) return false;
  const files = patch.split(/^diff --git /m).slice(1);
  if (files.length === 0) return true;
  return files.some(fileSectionTouchesCode);
}

function isVersionPath(filePath) {
  if (filePath.includes(" => ") || filePath.includes(" -> ")) return false;
  if (filePath === "CHANGELOG.md") return true;
  const base = path.posix.basename(filePath);
  return base === "package.json" || base === "Cargo.toml" || base === "Cargo.lock";
}

function commitTouchesCode(repo, sha) {
  const files = changedFiles(repo, sha);
  if (files.some((file) => !isVersionPath(file))) return true;
  const inspect = files.filter((file) => file !== "CHANGELOG.md");
  if (inspect.length === 0) return false;
  return patchTouchesCode(patchFor(repo, sha, inspect));
}

function commitsAfter(repo, baseline) {
  const args = ["rev-list", "HEAD"];
  if (baseline) args.push(`^${baseline}`);
  const out = git(repo, args).trim();
  return out ? out.split("\n").filter(Boolean) : [];
}

function codeCommitsSince(repo, baseline) {
  return commitsAfter(repo, baseline).filter((sha) => commitTouchesCode(repo, sha));
}

function findWorkspace(explicit) {
  if (explicit) {
    const root = path.resolve(explicit);
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) fail(`Not a workspace folder: ${root}`);
    return root;
  }
  const starts = [process.cwd()];
  if (process.argv[1]) starts.push(path.dirname(path.resolve(process.argv[1])));
  for (const start of starts) {
    let dir = path.resolve(start);
    for (let i = 0; i < 10; i++) {
      if (KNOWN_REPOS.some((name) => fs.existsSync(path.join(dir, name, ".git")))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  fail("Pass --root, the folder that contains the domdoc repos.");
}

function existingRepos(root) {
  const found = [];
  for (const name of KNOWN_REPOS) {
    const dir = path.join(root, name);
    if (!fs.existsSync(dir)) continue;
    if (!fs.existsSync(path.join(dir, ".git"))) fail(`${name} exists but is not a git root: ${dir}`);
    found.push({ name, dir });
  }
  if (found.length === 0) fail(`No domdoc repos under ${root}.`);
  return found;
}

function formatVersionList(rows) {
  const lines = rows.map((repo) => `  ${repo.name.padEnd(20)} ${repo.version ?? "(none)"}`);
  return `Repos are not on the same version:\n${lines.join("\n")}`;
}

function formatMissing(missing) {
  const lines = ["These repos have code changes and need a summary:"];
  for (const item of missing) {
    lines.push(`  ${item.name}`);
    const shown = item.commits.slice(0, 30);
    for (const sha of shown) {
      const subject = git(item.dir, ["log", "-1", "--format=%s", sha]).trim();
      lines.push(`    ${sha.slice(0, 7)} ${subject}`);
    }
    if (item.commits.length > shown.length) {
      lines.push(`    and ${item.commits.length - shown.length} more`);
    }
  }
  lines.push("");
  lines.push('Pass --repo-summary <repo> "One sentence." and repeat --repo-bullet <repo> "Phrase" when a bullet is needed.');
  lines.push("Repos with no code changes get a version bump only, with no feature note.");
  return lines.join("\n");
}

function sinceLabel(changelog) {
  return changelog ?? "the start";
}

function releaseShared(args) {
  if (args.repo) fail("A shared release covers every repo. Drop --repo.");
  if (args.summary || args.bullets.length) fail("Use --repo-summary and --repo-bullet with --shared.");

  const root = findWorkspace(args.root);
  const repos = existingRepos(root);
  for (const name of Object.keys(args.notes)) {
    if (!repos.some((repo) => repo.name === name)) fail(`No repo ${name} under ${root}.`);
  }

  const rows = repos.map((repo) => ({
    ...repo,
    version: findCurrentVersion(repo.dir),
    changelog: changelogVersion(repo.dir),
    head: hasHead(repo.dir),
  }));
  const problems = [];
  const dirty = rows.filter((repo) => dirtyStatus(repo.dir));
  if (dirty.length) {
    problems.push(`Uncommitted changes in:\n${dirty.map((repo) => `  ${repo.name}`).join("\n")}`);
  }
  const uncommitted = rows.filter((repo) => !repo.head);
  if (uncommitted.length) {
    problems.push(`No commits in:\n${uncommitted.map((repo) => `  ${repo.name}`).join("\n")}`);
  }
  const present = rows.filter((repo) => repo.version);
  if (present.length === 0 || new Set(present.map((repo) => repo.version)).size !== 1) {
    problems.push(formatVersionList(rows));
  }
  for (const repo of rows) {
    if (repo.version && repo.changelog && repo.version !== repo.changelog) {
      problems.push(
        `${repo.name} CHANGELOG.md starts at ${repo.changelog} and the version files are ${repo.version}.`,
      );
    }
  }
  if (problems.length) fail(problems.join("\n\n"));

  const from = present[0].version;
  const to = targetVersion(from, args);
  const date = resolveDate(args.date);
  const classified = rows.map((repo) => {
    const baseline = repo.changelog ? baselineCommit(repo.dir, repo.changelog) : null;
    if (repo.changelog && !baseline) {
      fail(`${repo.name} CHANGELOG.md has ${repo.changelog} but no commit introduces that heading.`);
    }
    const commits = codeCommitsSince(repo.dir, baseline);
    const supplied = args.notes[repo.name];
    if (commits.length === 0) {
      return {
        ...repo,
        missing: false,
        ignoredSupplied: Boolean(supplied?.summary || supplied?.bullets?.length),
        summary: versionBumpOnlySummary(to),
        bullets: [],
        commits,
        previous: sinceLabel(repo.changelog),
      };
    }
    if (!supplied?.summary) return { ...repo, missing: true, commits };
    return {
      ...repo,
      missing: false,
      ignoredSupplied: false,
      summary: cleanSummary(supplied.summary),
      bullets: cleanBullets(supplied.bullets ?? []),
      commits,
      previous: sinceLabel(repo.changelog),
    };
  });

  const missing = classified.filter((repo) => repo.missing);
  if (missing.length) fail(formatMissing(missing));

  const plans = classified.map((repo) => {
    const entry = renderEntry(to, date, repo.summary, repo.bullets);
    return { ...repo, entry, writes: collectWrites(repo.dir, repo.version, to, entry) };
  });

  console.log(`workspace: ${root}`);
  if (args.bump) console.log(`bump: ${args.bump}`);
  console.log(`version: ${from} → ${to}`);
  console.log("");
  for (const plan of plans) {
    console.log(`repo: ${plan.dir}`);
    if (plan.commits.length === 0) console.log(`changes: no code changes since ${plan.previous}`);
    else {
      const count = plan.commits.length;
      console.log(`changes: ${count} code commit${count === 1 ? "" : "s"} since ${plan.previous}`);
    }
    if (plan.ignoredSupplied) {
      console.log("note: ignored the supplied summary because this repo has no code changes");
    }
    console.log("files:");
    for (const item of plan.writes) console.log(`  ${path.relative(plan.dir, item.file)}`);
    console.log("changelog:");
    console.log(plan.entry.trimEnd());
    console.log("");
  }

  if (args.dryRun) {
    console.log("Dry run. Wrote nothing.");
    return;
  }
  for (const plan of plans) {
    for (const item of plan.writes) fs.writeFileSync(item.file, item.text);
  }
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    fail(error.message);
  }
  if (args.help) {
    console.log(usage());
    return;
  }
  if (!args.shared || args.repo || args.summary || args.bullets.length) {
    fail(`One command sets the same version on every repo.\n${usage()}`);
  }
  releaseShared(args);
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) main();
