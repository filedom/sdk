#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const blueprint = readFileSync(
  join(webRoot, "..", "Domdoc_Product_Blueprint.md"),
  "utf8",
);
const existing = JSON.parse(
  readFileSync(join(webRoot, "docs", "feature-registry.json"), "utf8"),
);

const parsed = [];
const re = /- \*\*(F\d+) — ([^:]+):\*\* ([^\n]+)/g;
let match;
while ((match = re.exec(blueprint)) !== null) {
  parsed.push({
    id: match[1],
    description: match[2].trim(),
    detail: match[3].trim(),
  });
}

if (parsed.length !== 164) {
  console.error(`[generate-feature-registry] expected 164 features, got ${parsed.length}`);
  process.exit(1);
}

const byId = new Map((existing.features ?? []).map((f) => [f.id, f]));

const implementedNotes = {
  F01: "local picker + drop; URL fetch helper with abort; no authenticated host loader UI",
  F02: "magic/MIME/filename probe (PDF/DOCX/ZIP/.domdoc/OLE/encrypt)",
  F03: "detect encrypted PDF/OLE as encrypted-unsupported; no password prompt/decrypt",
  F04: "session documentId + SHA-256 member hashes when blob bytes given",
  F05: "demo toolbar save/undo stub; not full shared shell",
  F07: "pt/css zoom/fit transforms; layout remains in points",
  F09: "compositor caret/pointer stub",
  F10: "engine geometry + caret map stubs",
  F11: "paragraph story search with next/prev",
  F12: "D10 unicode/emoji/Arabic through WASM flow lines (no independent font-fallback oracle)",
  F14: "React/Vue/Lit/Angular/Svelte/Preact/Solid + Next/Nuxt/SvelteKit/Astro host stubs",
  F18: "review-thread-stub grouping from comments.xml",
  F20: "comments-part + annotation wire stubs; D04 ranges read-only",
  F21: "historical code id on ProseMirror demo slice (blueprint F21 is text markup)",
  F25: "paragraph text patch via DocxStore + ProseMirror projection",
  F26: "numbering.xml runtime markers + WASM flow prefix",
  F29: "G1 C24 writer path; native proofs when vendor production WASM present",
  F34: "accept/reject unwraps w:ins/w:del; PM demo reject + comment accept OPC patch",
  F37: "in-memory .domdoc package stub (no IDB/OPFS)",
  F39: "docx-export-stub + track-changes export after session accept (w:ins/w:del snapshot)",
  F41: "crash-safe commit plan simulation; no IndexedDB journal",
  F42: "fenced tab writer stub + committed-manifest recovery policy",
  F45: "demo roles/labels; physical SR not-run",
  F50: "historical code id on ordered collab stub (blueprint F50 is advanced tables)",
  F86: "CollaborationProviderOrderedStub monotonic events; no Yjs canonical model",
  F113: "framework adapter stubs + Next client-boundary host",
  F119: "AF incremental legal-break line texts + C01–C04 web measurement contract",
  F121: "compositor input/geometry hook",
  F140: "story-scope find/replace on paragraph texts",
};

const coreEarly = new Set(
  Array.from({ length: 48 }, (_, i) => `F${String(i + 1).padStart(2, "0")}`),
);

const features = parsed.map((item) => {
  const prev = byId.get(item.id) ?? {};
  const note = implementedNotes[item.id];
  return {
    id: item.id,
    description: item.description,
    milestone: prev.milestone ?? (coreEarly.has(item.id) ? "M0" : "M5"),
    implementationStatus: note || prev.implementationStatus ? "partial" : "not-started",
    verificationStatus: "unverified",
    acceptanceIds: prev.acceptanceIds ?? [],
    gateIds: prev.gateIds ?? [],
    limits: note ?? prev.limits ?? item.detail,
  };
});

const appendPath = join(webRoot, "docs", "feature-registry-append.json");
const append = existsSync(appendPath)
  ? JSON.parse(readFileSync(appendPath, "utf8")).features ?? []
  : [];
for (const extra of append) {
  if (!features.some((f) => f.id === extra.id)) {
    features.push(extra);
  }
}

const out = {
  schemaVersion: 1,
  updatedAt: "2026-10-17-f01-f165-registry",
  contractHash: existing.contractHash,
  features,
};

writeFileSync(
  join(webRoot, "docs", "feature-registry.json"),
  `${JSON.stringify(out, null, 2)}\n`,
);
console.log(`[generate-feature-registry] wrote ${features.length} features`);
