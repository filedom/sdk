---
name: release-commit
description: >-
  Set the shared domdoc version (patch, minor, major, or an exact number) and
  write a short changelog in each repo, then commit when asked. Use when the
  user asks to commit, ship, release, bump a version, or add a changelog entry.
---

# Release commit

When the user asks to commit, ship, or release work, set one version on every domdoc repo and record a short changelog in each repo. Do this before the version commit. If they did not ask to commit, stop after the version and changelog update.

`domdoc-sdk`, `domdoc-wasm`, `domdoc-api`, `domdoc-website`, and `domdoc-benchmarks` share one version number. Each repo keeps its own `CHANGELOG.md`. The note in a repo lists only commits in that repo since its previous changelog version. A repo with no code commits still gets the new version: one sentence that the version moved to match the other repos, and no feature bullets.

The shared command refuses a repo with uncommitted changes and names that repo. Uncommitted files are not a changelog. If repos that already have a version are not on the same version, it prints each version and stops. A missing version field is printed as `(none)` in that list. When the other repos agree, that repo still receives the shared number. Do not guess, and do not bump one repo on its own.

## Pick the bump

Use the level the user named, or the exact version they named. Otherwise pick from the commits since the previous changelog version:

| Diff | Pass to the script |
| --- | --- |
| Fix, docs, tests, or internal work with the same behavior | `--bump patch` |
| New behavior existing callers can ignore | `--bump minor` |
| User asked for a major or 1.0 release | `--bump major` |
| User named a version, such as 0.2.0 | `--version 0.2.0` |

While the version starts with 0, a breaking change (removed or renamed public API, changed event, changed wire format or file that older builds cannot read) is `--bump minor`. From 1.0.0 on, that same break is `--bump major`.

If patch and minor both seem possible, use patch.

## Write the note

One sentence a person can read without opening the diff. Then at most four bullets, and only when the sentence needs them. A single fix is the sentence alone.

Write a note only for a repo that has commits since its previous changelog version which touch something other than the version and the changelog. Read those commits in that repo. Do not mention another repo's work. Do not invent a feature for a repo that has no such commits. The script writes this sentence there and ignores any feature note you pass:

`The version moved to <version> to match the other repos.`

- Say what someone can do, or what works now.
- Use plain words. One idea per line.
- Summary ends with a period and stays under 140 characters.
- Each bullet is a short phrase under 90 characters, with no final period.
- Skip file names, function names, ticket ids, test names, and "this commit".

```markdown
## 0.2.0 — 17 Oct 2026

You can highlight a passage and keep it in the downloaded file.

- Mark the selected text
- The highlight is still there after download
```

A fix:

```markdown
## 0.1.1 — 17 Oct 2026

The caret stays visible after a format switch.
```

A repo that only moved to the shared version:

```markdown
## 0.2.0 — 17 Oct 2026

The version moved to 0.2.0 to match the other repos.
```

## Apply it

`node scripts/release.mjs --shared` is the only command that sets the shared version. Run it from this skill's directory. `--root` is the folder that contains the repos. Omit `--root` when the script can walk up to that folder. Repeat `--repo-summary` and `--repo-bullet` for each repo that has code changes. Omit repos that have none. `--dry-run` prints the notes and writes nothing.

```bash
node scripts/release.mjs \
  --shared \
  --root /absolute/path/to/domdoc \
  --bump patch \
  --repo-summary domdoc-sdk "The caret stays visible after a format switch." \
  --repo-summary domdoc-wasm "A long word without spaces wraps onto the next line."
```

An exact version:

```bash
node scripts/release.mjs \
  --shared \
  --root /absolute/path/to/domdoc \
  --version 0.2.0 \
  --repo-summary domdoc-sdk "The caret stays visible after a format switch."
```

The script checks that every existing repo is clean. Repos that already have a version must share it. If they do not, it prints each version, including `(none)` where a repo has no version field, and stops.

`domdoc-benchmarks` may have no `version` field yet. When the other repos agree, the script adds `version` to its `package.json` and writes the same number there. It also sets each root `package.json` `version` to that number, and any other `package.json` `version` still on the current version. In `domdoc-wasm` the release version is the Cargo workspace version: the script sets `[workspace.package]` `version` to the same number, plus crate `version = "…"` lines and `domdoc-*` entries in `Cargo.lock` that are still on the current version. It inserts each note at the top of that repo's `CHANGELOG.md`.

Read the printed sections. If the wording is rejected, put every repo back on the previous number, then run the command again. Do not hand-edit a subset of the version files.

## Commit

Commit only when the user asked to commit, ship, or release. If a repo is dirty and they did not ask to commit, stop and name that repo. The shared command will refuse it.

When they did ask, commit the work in each repo first. Uncommitted files are not written into the changelog. Then run the shared command. Then commit `CHANGELOG.md` and the version files it listed, one commit per repo. Leave unrelated dirty files unstaged. Do not stage secrets.

Subject is the version, an em dash, and that repo's summary. The body is the bullets, or empty when there are none. A version-only repo uses the sentence the script wrote.

```text
0.1.1 — The caret stays visible after a format switch.
```

Follow the usual git safety rules: no config changes, no `--no-verify`, no force push, no amend unless the user asked and the amend rules allow it. Do not push. Say the shared version and the bump in the reply.
